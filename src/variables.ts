import type { CompanionVariableDefinitions, CompanionVariableValues } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { STOPPED, cameraName } from './state.js'

/**
 * Variables are numbered by each camera's and controller's position in PTZ Pilot's lists, so the set
 * depends on how many there are and can't be a static schema.
 */
export type VariablesSchema = CompanionVariableValues

const STATUS_LABELS: Record<string, string> = {
	responding: 'Responding',
	'not-responding': 'Not responding',
	waiting: 'No reply yet',
	'not-connected': 'Not connected',
	error: 'Error',
}

/** Rebuild the definitions: needed whenever the number of cameras or controllers changes */
export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: CompanionVariableDefinitions<VariablesSchema> = {
		version: { name: 'PTZ Pilot version' },
		connected: { name: 'Connected to PTZ Pilot (true/false)' },
		selected_camera_name: { name: 'Camera selected in PTZ Pilot: name' },
		selected_camera_number: { name: 'Camera selected in PTZ Pilot: number' },
		camera_count: { name: 'Number of cameras' },
		controller_count: { name: 'Number of controllers' },
		controllers_connected: { name: 'Number of controllers connected' },
	}

	self.state.cameras.forEach((_, i) => {
		const n = i + 1
		definitions[`camera_${n}_name`] = { name: `Camera ${n}: name` }
		definitions[`camera_${n}_status`] = { name: `Camera ${n}: status` }
		definitions[`camera_${n}_address`] = { name: `Camera ${n}: address` }
		definitions[`camera_${n}_controllers`] = { name: `Camera ${n}: controllers driving it` }
		definitions[`camera_${n}_moving`] = { name: `Camera ${n}: moving (true/false)` }
		for (const m of ['pan', 'tilt', 'zoom', 'focus']) {
			definitions[`camera_${n}_${m}`] = { name: `Camera ${n}: ${m} speed` }
		}
	})

	self.state.controllers.forEach((_, i) => {
		const n = i + 1
		definitions[`controller_${n}_name`] = { name: `Controller ${n}: name` }
		definitions[`controller_${n}_connected`] = { name: `Controller ${n}: connected (true/false)` }
		definitions[`controller_${n}_camera`] = { name: `Controller ${n}: camera it drives` }
	})

	self.setVariableDefinitions(definitions)
	UpdateVariableValues(self)
}

export function UpdateVariableValues(self: ModuleInstance): void {
	const state = self.state
	const values: CompanionVariableValues = {
		version: state.version ?? '',
		connected: self.isConnected,
		selected_camera_name: cameraName(state, state.activeCamera),
		selected_camera_number: state.cameras.find((c) => c.id === state.activeCamera)?.number ?? '',
		camera_count: state.cameras.length,
		controller_count: state.controllers.length,
		controllers_connected: state.controllers.filter((c) => c.connected).length,
	}

	state.cameras.forEach((camera, i) => {
		const n = i + 1
		const motion = state.cameraMotion[camera.id] ?? STOPPED
		values[`camera_${n}_name`] = camera.name
		values[`camera_${n}_status`] = camera.error ?? STATUS_LABELS[camera.status] ?? camera.status
		values[`camera_${n}_address`] = camera.address
		values[`camera_${n}_controllers`] = camera.controllers
			.map((id) => state.controllers.find((c) => c.id === id)?.name ?? id)
			.join(', ')
		values[`camera_${n}_moving`] = motion.pan !== 0 || motion.tilt !== 0 || motion.zoom !== 0 || motion.focus !== 0
		values[`camera_${n}_pan`] = motion.pan
		values[`camera_${n}_tilt`] = motion.tilt
		values[`camera_${n}_zoom`] = motion.zoom
		values[`camera_${n}_focus`] = motion.focus
	})

	state.controllers.forEach((controller, i) => {
		const n = i + 1
		values[`controller_${n}_name`] = controller.name
		values[`controller_${n}_connected`] = controller.connected
		values[`controller_${n}_camera`] = cameraName(state, controller.camera) || 'None'
	})

	self.setVariableValues(values)
}
