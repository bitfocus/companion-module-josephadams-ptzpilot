import { InstanceBase, type SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_PORT, GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { FEEDBACK_IDS, MOTION_FEEDBACK_IDS, UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdateVariableDefinitions, UpdateVariableValues, type VariablesSchema } from './variables.js'
import { UpdatePresets } from './presets.js'
import { Link } from './link.js'
import { createState, type ModuleState, type ServerMessage, type StateMessage } from './state.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** The API version this module was written against */
const API_VERSION = 1

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	/** Mutated in place, since action and feedback callbacks hold on to it */
	readonly state: ModuleState = createState()

	#link: Link | undefined
	#nextRequestId = 1
	/** What the camera and controller lists last looked like, to know when definitions need rebuilding */
	#structure = ''

	constructor(internal: unknown) {
		super(internal)
	}

	get isConnected(): boolean {
		return this.#link?.isConnected === true
	}

	async init(config: ModuleConfig): Promise<void> {
		await this.configUpdated(config)
	}

	async destroy(): Promise<void> {
		this.#link?.close()
		this.#link = undefined
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.#resetState()
		this.#rebuildDefinitions()
		this.#connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Send a request to PTZ Pilot. Failures come back as responses and are logged; there is nothing for
	 * a button press to wait on.
	 */
	request(body: { type: string; [key: string]: unknown }): boolean {
		// Leave out fields that are undefined, e.g. no camera, so PTZ Pilot applies its defaults
		const message = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
		const sent = this.#link?.send({ id: this.#nextRequestId++, ...message }) ?? false
		if (!sent) this.log('warn', `Not connected to PTZ Pilot, so "${body.type}" was not sent`)
		return sent
	}

	// --- Connection ---------------------------------------------------------------------

	#connect(): void {
		this.#link?.close()

		const host = this.config.host?.trim() || '127.0.0.1'
		const port = this.config.port > 0 ? this.config.port : DEFAULT_PORT

		this.#link = new Link({
			url: `ws://${host}:${port}`,
			onMessage: (message) => this.#onMessage(message),
			onOpen: () => UpdateVariableValues(this),
			onClose: () => {
				// Nothing shown should suggest a live connection that isn't there
				this.#resetState()
				this.#refreshAll()
			},
			onStatus: (status, message) => this.updateStatus(status, message),
			log: (level, message) => this.log(level, message),
		})
		this.#link.open()
	}

	#onMessage(message: ServerMessage): void {
		switch (message.type) {
			case 'hello':
				this.state.version = message.version
				if (message.apiVersion !== API_VERSION) {
					this.log(
						'warn',
						`PTZ Pilot ${message.version} speaks API version ${message.apiVersion}; this module expects ${API_VERSION}`,
					)
				}
				UpdateVariableValues(this)
				break

			case 'state':
				this.#applyState(message)
				break

			case 'telemetry':
				this.state.cameraMotion = message.cameras ?? {}
				this.state.controllerMotion = message.controllers ?? {}
				UpdateVariableValues(this)
				this.checkFeedbacks(...MOTION_FEEDBACK_IDS)
				break

			case 'response':
				if (!message.ok) this.log('warn', `PTZ Pilot: ${message.error ?? 'request failed'}`)
				break
		}
	}

	#applyState(message: StateMessage): void {
		this.state.activeCamera = message.activeCamera
		this.state.cameras = message.cameras ?? []
		this.state.controllers = message.controllers ?? []

		// Choices, variables and presets list every camera and controller, so rebuild them when the lists
		// change; otherwise just refresh values and feedbacks
		const structure = JSON.stringify([
			this.state.cameras.map((c) => [c.id, c.name, c.number]),
			this.state.controllers.map((c) => [c.id, c.name, c.connected]),
		])
		if (structure !== this.#structure) {
			this.#structure = structure
			this.#rebuildDefinitions()
		} else {
			this.#refreshAll()
		}
	}

	#resetState(): void {
		Object.assign(this.state, createState())
		this.#structure = ''
	}

	#rebuildDefinitions(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdatePresets(this)
		this.checkFeedbacks(...FEEDBACK_IDS)
	}

	#refreshAll(): void {
		UpdateVariableValues(this)
		this.checkFeedbacks(...FEEDBACK_IDS)
	}
}
