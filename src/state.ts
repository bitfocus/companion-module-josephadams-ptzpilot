/**
 * What PTZ Pilot tells us, as described in its docs/api.md (API version 1).
 */

export type CameraStatus = 'responding' | 'not-responding' | 'waiting' | 'not-connected' | 'error'

export interface CameraInfo {
	id: string
	/** Position in PTZ Pilot's list, from 1 */
	number: number
	name: string
	protocol: 'sony-udp' | 'udp' | 'tcp' | 'serial'
	address: string
	status: CameraStatus
	error?: string
	/** Connected controllers currently driving this camera */
	controllers: string[]
}

export interface ControllerInfo {
	id: string
	name: string
	kind: 'gamepad' | 'dji'
	connected: boolean
	/** Connected and reporting; false while it has gone quiet */
	live: boolean
	camera: string | null
}

/** Signed speeds: pan right, tilt up, zoom in and focus far are positive. 0 is stopped. */
export interface Motion {
	pan: number
	tilt: number
	zoom: number
	focus: number
}

export const STOPPED: Motion = { pan: 0, tilt: 0, zoom: 0, focus: 0 }

export interface StateMessage {
	type: 'state'
	activeCamera: string | null
	cameras: CameraInfo[]
	controllers: ControllerInfo[]
}

export interface TelemetryMessage {
	type: 'telemetry'
	cameras: Record<string, Motion>
	controllers: Record<string, Motion>
}

export interface HelloMessage {
	type: 'hello'
	app: string
	version: string
	apiVersion: number
}

export interface ResponseMessage {
	type: 'response'
	id?: string | number
	ok: boolean
	error?: string
}

export type ServerMessage = HelloMessage | StateMessage | TelemetryMessage | ResponseMessage

export interface ModuleState {
	version: string | undefined
	activeCamera: string | null
	cameras: CameraInfo[]
	controllers: ControllerInfo[]
	cameraMotion: Record<string, Motion>
	controllerMotion: Record<string, Motion>
}

export function createState(): ModuleState {
	return {
		version: undefined,
		activeCamera: null,
		cameras: [],
		controllers: [],
		cameraMotion: {},
		controllerMotion: {},
	}
}

/** Option value meaning "whichever camera PTZ Pilot's window is showing" */
export const SELECTED_CAMERA = 'selected'
/** Option value meaning "no camera" */
export const NO_CAMERA = 'none'

/** Option values arrive as strings or numbers; anything else can't name a camera or controller */
function optionText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

/**
 * Resolve a camera option to a camera. Options normally hold an id, but a typed-in name or list number
 * works too, as it does in PTZ Pilot's API.
 */
export function findCamera(state: ModuleState, value: unknown): CameraInfo | undefined {
	if (value === SELECTED_CAMERA || value === '' || value === undefined || value === null) {
		return state.cameras.find((c) => c.id === state.activeCamera)
	}
	const text = optionText(value)
	return (
		state.cameras.find((c) => c.id === text) ??
		state.cameras.find((c) => c.name.toLowerCase() === text.toLowerCase()) ??
		state.cameras.find((c) => String(c.number) === text)
	)
}

export function findController(state: ModuleState, value: unknown): ControllerInfo | undefined {
	const text = optionText(value)
	return (
		state.controllers.find((c) => c.id === text) ??
		state.controllers.find((c) => c.name.toLowerCase() === text.toLowerCase())
	)
}

export function cameraName(state: ModuleState, id: string | null | undefined): string {
	return state.cameras.find((c) => c.id === id)?.name ?? ''
}
