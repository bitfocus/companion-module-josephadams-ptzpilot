import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { cameraChoices, controllerChoices } from './moves.js'
import { NO_CAMERA, SELECTED_CAMERA, findCamera, findController, type Motion } from './state.js'

export type FeedbacksSchema = {
	camera_status: { type: 'boolean'; options: { camera: string; status: string } }
	camera_selected: { type: 'boolean'; options: { camera: string } }
	camera_moving: { type: 'boolean'; options: { camera: string; movement: string } }
	camera_driven: { type: 'boolean'; options: { camera: string } }
	controller_connected: { type: 'boolean'; options: { controller: string } }
	controller_on_camera: { type: 'boolean'; options: { controller: string; camera: string } }
}

export const FEEDBACK_IDS = [
	'camera_status',
	'camera_selected',
	'camera_moving',
	'camera_driven',
	'controller_connected',
	'controller_on_camera',
] as const satisfies readonly (keyof FeedbacksSchema)[]

/** Feedbacks that depend on live movement, checked on every telemetry update */
export const MOTION_FEEDBACK_IDS = ['camera_moving'] as const satisfies readonly (keyof FeedbacksSchema)[]

const GREEN = combineRgb(0, 153, 51)
const RED = combineRgb(204, 0, 0)
const BLUE = combineRgb(0, 102, 204)
const AMBER = combineRgb(204, 136, 0)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

export function UpdateFeedbacks(self: ModuleInstance): void {
	const state = self.state
	const firstCamera = state.cameras[0]?.id ?? ''
	const firstController = state.controllers[0]?.id ?? ''

	const camera = (withSelected = true) =>
		({
			type: 'dropdown',
			id: 'camera',
			label: 'Camera',
			default: withSelected ? SELECTED_CAMERA : firstCamera,
			choices: cameraChoices(state, { selected: withSelected }),
			allowCustom: true,
		}) as const

	const controller = {
		type: 'dropdown',
		id: 'controller',
		label: 'Controller',
		default: firstController,
		choices: controllerChoices(state),
		allowCustom: true,
	} as const

	const feedbacks: CompanionFeedbackDefinitions<FeedbacksSchema> = {
		camera_status: {
			type: 'boolean',
			name: 'Camera: status',
			description: 'Whether PTZ Pilot reports the camera in the given state',
			options: [
				camera(),
				{
					type: 'dropdown',
					id: 'status',
					label: 'Status',
					default: 'responding',
					choices: [
						{ id: 'responding', label: 'Responding' },
						{ id: 'not-responding', label: 'Not responding' },
						{ id: 'waiting', label: 'No reply yet' },
						{ id: 'not-connected', label: 'Not connected' },
						{ id: 'error', label: 'Error' },
						{ id: 'problem', label: 'Any problem (not responding)' },
					],
				},
			],
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			callback: (event) => {
				const cam = findCamera(state, event.options.camera)
				if (!cam) return event.options.status === 'problem'
				if (event.options.status === 'problem') return cam.status !== 'responding'
				return cam.status === event.options.status
			},
		},

		camera_selected: {
			type: 'boolean',
			name: 'Camera: selected in PTZ Pilot',
			description: 'Whether the camera is the one PTZ Pilot’s window is showing',
			options: [camera(false)],
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			callback: (event) => {
				const cam = findCamera(state, event.options.camera)
				return !!cam && cam.id === state.activeCamera
			},
		},

		camera_moving: {
			type: 'boolean',
			name: 'Camera: moving',
			description: 'Whether the camera is being moved, by a controller or by Companion',
			options: [
				camera(),
				{
					type: 'dropdown',
					id: 'movement',
					label: 'Movement',
					default: 'any',
					choices: [
						{ id: 'any', label: 'Any' },
						{ id: 'pan', label: 'Pan' },
						{ id: 'tilt', label: 'Tilt' },
						{ id: 'zoom', label: 'Zoom' },
						{ id: 'focus', label: 'Focus' },
					],
				},
			],
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			callback: (event) => {
				const cam = findCamera(state, event.options.camera)
				const motion: Motion | undefined = cam ? state.cameraMotion[cam.id] : undefined
				if (!motion) return false
				const which = event.options.movement
				if (which === 'any') return motion.pan !== 0 || motion.tilt !== 0 || motion.zoom !== 0 || motion.focus !== 0
				return motion[which as keyof Motion] !== 0
			},
		},

		camera_driven: {
			type: 'boolean',
			name: 'Camera: driven by a controller',
			description: 'Whether any connected controller is assigned to the camera',
			options: [camera()],
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			callback: (event) => (findCamera(state, event.options.camera)?.controllers.length ?? 0) > 0,
		},

		controller_connected: {
			type: 'boolean',
			name: 'Controller: connected',
			description: 'Whether the controller is connected and reporting',
			options: [controller],
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			callback: (event) => {
				const c = findController(state, event.options.controller)
				return !!c && c.connected && c.live
			},
		},

		controller_on_camera: {
			type: 'boolean',
			name: 'Controller: drives camera',
			description: 'Whether the controller is assigned to the camera',
			options: [
				controller,
				{
					type: 'dropdown',
					id: 'camera',
					label: 'Camera',
					default: firstCamera,
					choices: cameraChoices(state, { none: true }),
					allowCustom: true,
				},
			],
			defaultStyle: { bgcolor: RED, color: WHITE },
			callback: (event) => {
				const c = findController(state, event.options.controller)
				if (!c) return false
				if (event.options.camera === NO_CAMERA) return c.camera === null
				return c.camera !== null && c.camera === findCamera(state, event.options.camera)?.id
			},
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
