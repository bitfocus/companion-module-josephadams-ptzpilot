import type { CompanionActionDefinitions, SomeCompanionActionInputField } from '@companion-module/base'
import type ModuleInstance from './main.js'
import {
	DIRECTION_CHOICES,
	STOP_CHOICES,
	cameraChoices,
	controllerChoices,
	directionToFractions,
	stopFractionsFor,
} from './moves.js'
import { NO_CAMERA, SELECTED_CAMERA, findCamera, findController } from './state.js'

export type ActionsSchema = {
	select_camera: { options: { camera: string } }
	controller_camera: { options: { controller: string; camera: string } }
	controller_step: { options: { controller: string; step: string } }
	preset_recall: { options: { camera: string; preset: number } }
	preset_store: { options: { camera: string; preset: number } }
	home: { options: { camera: string } }
	one_push_focus: { options: { camera: string } }
	autofocus: { options: { camera: string; mode: string } }
	move: { options: { camera: string; direction: string; speed: number } }
	stop: { options: { camera: string; which: string } }
}

export function UpdateActions(self: ModuleInstance): void {
	const state = self.state
	const firstCamera = state.cameras[0]?.id ?? ''
	const firstController = state.controllers[0]?.id ?? ''

	/** Most actions act on a camera; by default the one PTZ Pilot's window is showing */
	const cameraOption = (defaultValue = SELECTED_CAMERA): SomeCompanionActionInputField<'camera'> => ({
		type: 'dropdown',
		id: 'camera',
		label: 'Camera',
		default: defaultValue,
		choices: cameraChoices(state, { selected: true }),
		allowCustom: true,
		tooltip: 'Pick a camera, or type its name or number in PTZ Pilot',
	})

	const controllerOption: SomeCompanionActionInputField<'controller'> = {
		type: 'dropdown',
		id: 'controller',
		label: 'Controller',
		default: firstController,
		choices: controllerChoices(state),
		allowCustom: true,
		tooltip: 'Pick a controller, or type its name as PTZ Pilot shows it',
	}

	const presetOption: SomeCompanionActionInputField<'preset'> = {
		type: 'number',
		id: 'preset',
		label: 'Preset',
		default: 1,
		min: 1,
		max: 256,
	}

	/** Camera options can name a camera by id, name or number; send whatever resolves */
	const cameraFor = (value: string): string | undefined => {
		if (value === SELECTED_CAMERA) return undefined
		const camera = findCamera(state, value)
		if (!camera) self.log('warn', `No camera "${value}" in PTZ Pilot`)
		return camera?.id ?? value
	}

	const actions: CompanionActionDefinitions<ActionsSchema> = {
		select_camera: {
			name: 'Select camera in PTZ Pilot',
			description:
				'Show a camera in the PTZ Pilot window. Actions set to "Camera selected in PTZ Pilot" then act on it.',
			options: [
				{
					type: 'dropdown',
					id: 'camera',
					label: 'Camera',
					default: firstCamera,
					choices: cameraChoices(state),
					allowCustom: true,
				},
			],
			callback: async (event) => {
				self.request({ type: 'selectCamera', camera: cameraFor(event.options.camera) })
			},
		},

		controller_camera: {
			name: 'Controller: drive camera',
			description: 'Point a controller at a camera, or at none',
			options: [
				controllerOption,
				{
					type: 'dropdown',
					id: 'camera',
					label: 'Camera',
					default: firstCamera,
					choices: cameraChoices(state, { none: true }),
					allowCustom: true,
				},
			],
			callback: async (event) => {
				const camera = event.options.camera === NO_CAMERA ? null : cameraFor(event.options.camera)
				self.request({ type: 'setControllerCamera', controller: controllerFor(event.options.controller), camera })
			},
		},

		controller_step: {
			name: 'Controller: next or previous camera',
			options: [
				controllerOption,
				{
					type: 'dropdown',
					id: 'step',
					label: 'Step',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next camera' },
						{ id: 'previous', label: 'Previous camera' },
					],
				},
			],
			callback: async (event) => {
				self.request({
					type: 'stepControllerCamera',
					controller: controllerFor(event.options.controller),
					step: event.options.step === 'previous' ? -1 : 1,
				})
			},
		},

		preset_recall: {
			name: 'Recall preset',
			options: [cameraOption(), presetOption],
			callback: async (event) => {
				self.request({ type: 'presetRecall', camera: cameraFor(event.options.camera), preset: event.options.preset })
			},
		},

		preset_store: {
			name: 'Store preset',
			description: "Save the camera's current position as a preset",
			options: [cameraOption(), presetOption],
			callback: async (event) => {
				self.request({ type: 'presetStore', camera: cameraFor(event.options.camera), preset: event.options.preset })
			},
		},

		home: {
			name: 'Home',
			options: [cameraOption()],
			callback: async (event) => {
				self.request({ type: 'home', camera: cameraFor(event.options.camera) })
			},
		},

		one_push_focus: {
			name: 'One-push autofocus',
			description: 'Focus once, then hold',
			options: [cameraOption()],
			callback: async (event) => {
				self.request({ type: 'onePushFocus', camera: cameraFor(event.options.camera) })
			},
		},

		autofocus: {
			name: 'Autofocus on or off',
			options: [
				cameraOption(),
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Autofocus',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off (manual focus)' },
					],
				},
			],
			callback: async (event) => {
				self.request({
					type: 'autoFocus',
					camera: cameraFor(event.options.camera),
					enabled: event.options.mode !== 'off',
				})
			},
		},

		move: {
			name: 'Move (hold)',
			description:
				'Start moving the camera. It keeps moving until a Stop action, so put this on press and Stop on release. The presets are set up that way.',
			options: [
				cameraOption(),
				{
					type: 'dropdown',
					id: 'direction',
					label: 'Direction',
					default: 'up',
					choices: DIRECTION_CHOICES,
				},
				{
					type: 'number',
					id: 'speed',
					label: 'Speed (%)',
					default: 50,
					min: 1,
					max: 100,
					range: true,
				},
			],
			callback: async (event) => {
				self.request({
					type: 'move',
					camera: cameraFor(event.options.camera),
					...directionToFractions(event.options.direction, event.options.speed),
				})
			},
		},

		stop: {
			name: 'Stop moving',
			options: [
				cameraOption(),
				{
					type: 'dropdown',
					id: 'which',
					label: 'Stop',
					default: 'all',
					choices: STOP_CHOICES,
				},
			],
			callback: async (event) => {
				const camera = cameraFor(event.options.camera)
				const stop = stopFractionsFor(event.options.which)
				if (stop === 'all') {
					// Without a camera, PTZ Pilot would stop everything this connection is moving; send the one meant
					self.request({ type: 'stop', camera: camera ?? state.activeCamera ?? undefined })
				} else {
					self.request({ type: 'move', camera, ...stop })
				}
			},
		},
	}

	function controllerFor(value: string): string {
		const controller = findController(state, value)
		if (!controller) self.log('warn', `No controller "${value}" in PTZ Pilot`)
		return controller?.id ?? value
	}

	self.setActionDefinitions(actions)
}
