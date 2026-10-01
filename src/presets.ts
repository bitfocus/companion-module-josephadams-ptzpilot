import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetGroup,
	type CompanionPresetSection,
} from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'
import { stopForDirection, type Direction } from './moves.js'
import type { CameraInfo, ControllerInfo } from './state.js'

const BLACK = combineRgb(0, 0, 0)
const WHITE = combineRgb(255, 255, 255)
const DARK = combineRgb(40, 40, 40)
const BLUE = combineRgb(0, 102, 204)
const GREEN = combineRgb(0, 153, 51)
const RED = combineRgb(204, 0, 0)
const AMBER = combineRgb(204, 136, 0)

/** Presets recalled by button, per camera */
const PRESET_BUTTONS = 8
const MOVE_SPEED = 50

const MOVES: { direction: Direction; text: string; name: string }[] = [
	{ direction: 'up_left', text: '↖', name: 'Up left' },
	{ direction: 'up', text: '⬆', name: 'Up' },
	{ direction: 'up_right', text: '↗', name: 'Up right' },
	{ direction: 'left', text: '⬅', name: 'Left' },
	{ direction: 'right', text: '➡', name: 'Right' },
	{ direction: 'down_left', text: '↙', name: 'Down left' },
	{ direction: 'down', text: '⬇', name: 'Down' },
	{ direction: 'down_right', text: '↘', name: 'Down right' },
	{ direction: 'zoom_in', text: 'ZOOM\nIN', name: 'Zoom in' },
	{ direction: 'zoom_out', text: 'ZOOM\nOUT', name: 'Zoom out' },
	{ direction: 'focus_near', text: 'FOCUS\nNEAR', name: 'Focus near' },
	{ direction: 'focus_far', text: 'FOCUS\nFAR', name: 'Focus far' },
]

const MOVEMENT_OF: Record<string, string> = { pan_tilt: 'any', zoom: 'zoom', focus: 'focus' }

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const structure: CompanionPresetSection[] = []

	for (const camera of self.state.cameras) {
		structure.push(cameraSection(camera, presets))
	}
	if (self.state.controllers.length > 0) {
		structure.push(controllersSection(self, self.state.controllers, self.state.cameras, presets))
	}

	self.setPresetDefinitions(structure, presets)
}

function cameraSection(camera: CameraInfo, presets: CompanionPresetDefinitions<ModuleSchema>): CompanionPresetSection {
	const c = camera.id
	const key = (name: string) => `camera_${c}_${name}`
	const groups: CompanionPresetGroup[] = []

	// Select, with its health shown
	presets[key('select')] = {
		type: 'simple',
		name: `Select ${camera.name}`,
		style: { text: camera.name, size: 'auto', color: WHITE, bgcolor: DARK },
		steps: [{ down: [{ actionId: 'select_camera', options: { camera: c } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'camera_selected', options: { camera: c }, style: { bgcolor: BLUE, color: WHITE } },
			{ feedbackId: 'camera_status', options: { camera: c, status: 'problem' }, style: { color: RED } },
		],
	}
	groups.push({ id: key('select_group'), type: 'simple', name: 'Select', presets: [key('select')] })

	// Hold to move: move on press, stop that movement on release
	for (const move of MOVES) {
		const which = stopForDirection(move.direction)
		presets[key(`move_${move.direction}`)] = {
			type: 'simple',
			name: `${camera.name}: ${move.name}`,
			style: { text: move.text, size: move.text.length > 2 ? '14' : '44', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'move', options: { camera: c, direction: move.direction, speed: MOVE_SPEED } }],
					up: [{ actionId: 'stop', options: { camera: c, which } }],
				},
			],
			feedbacks: [
				{
					feedbackId: 'camera_moving',
					options: { camera: c, movement: MOVEMENT_OF[which] },
					style: { bgcolor: AMBER, color: BLACK },
				},
			],
		}
	}
	groups.push({
		id: key('move_group'),
		type: 'simple',
		name: 'Move (hold)',
		presets: MOVES.map((m) => key(`move_${m.direction}`)),
	})

	presets[key('home')] = {
		type: 'simple',
		name: `${camera.name}: Home`,
		style: { text: 'HOME', size: '18', color: WHITE, bgcolor: DARK },
		steps: [{ down: [{ actionId: 'home', options: { camera: c } }], up: [] }],
		feedbacks: [],
	}
	presets[key('one_push_focus')] = {
		type: 'simple',
		name: `${camera.name}: One-push autofocus`,
		style: { text: 'ONE PUSH\nAF', size: '14', color: WHITE, bgcolor: DARK },
		steps: [{ down: [{ actionId: 'one_push_focus', options: { camera: c } }], up: [] }],
		feedbacks: [],
	}
	for (let n = 1; n <= PRESET_BUTTONS; n++) {
		presets[key(`preset_${n}`)] = {
			type: 'simple',
			name: `${camera.name}: Recall preset ${n}`,
			style: { text: `PRESET\n${n}`, size: '18', color: WHITE, bgcolor: DARK },
			steps: [{ down: [{ actionId: 'preset_recall', options: { camera: c, preset: n } }], up: [] }],
			feedbacks: [],
		}
	}
	groups.push({
		id: key('recall_group'),
		type: 'simple',
		name: 'Home and presets',
		presets: [
			key('home'),
			key('one_push_focus'),
			...Array.from({ length: PRESET_BUTTONS }, (_, i) => key(`preset_${i + 1}`)),
		],
	})

	return { id: key('section'), name: `${camera.number}: ${camera.name}`, definitions: groups }
}

function controllersSection(
	self: ModuleInstance,
	controllers: ControllerInfo[],
	cameras: CameraInfo[],
	presets: CompanionPresetDefinitions<ModuleSchema>,
): CompanionPresetSection {
	const groups: CompanionPresetGroup[] = []

	controllers.forEach((controller, i) => {
		const n = i + 1
		const key = (name: string) => `controller_${n}_${name}`

		// Shows which camera it drives; each press moves it on to the next
		presets[key('next')] = {
			type: 'simple',
			name: `${controller.name}: next camera`,
			style: {
				text: `${controller.name}\n→ $(${self.label}:controller_${n}_camera)`,
				size: 'auto',
				color: WHITE,
				bgcolor: DARK,
			},
			steps: [
				{ down: [{ actionId: 'controller_step', options: { controller: controller.id, step: 'next' } }], up: [] },
			],
			feedbacks: [
				{
					feedbackId: 'controller_connected',
					options: { controller: controller.id },
					style: { bgcolor: GREEN, color: WHITE },
				},
			],
		}

		const assign = cameras.map((camera) => {
			const id = key(`to_${camera.id}`)
			presets[id] = {
				type: 'simple',
				name: `${controller.name} → ${camera.name}`,
				style: { text: `${controller.name}\n→ ${camera.name}`, size: 'auto', color: WHITE, bgcolor: DARK },
				steps: [
					{
						down: [{ actionId: 'controller_camera', options: { controller: controller.id, camera: camera.id } }],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: 'controller_on_camera',
						options: { controller: controller.id, camera: camera.id },
						style: { bgcolor: RED, color: WHITE },
					},
				],
			}
			return id
		})

		groups.push({ id: key('group'), type: 'simple', name: controller.name, presets: [key('next'), ...assign] })
	})

	return { id: 'controllers', name: 'Controllers', definitions: groups }
}
