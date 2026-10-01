import type { DropdownChoice } from '@companion-module/base'
import { NO_CAMERA, SELECTED_CAMERA, type ModuleState, type Motion } from './state.js'

export type Direction =
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'up_left'
	| 'up_right'
	| 'down_left'
	| 'down_right'
	| 'zoom_in'
	| 'zoom_out'
	| 'focus_near'
	| 'focus_far'

export const DIRECTION_CHOICES: { id: Direction; label: string }[] = [
	{ id: 'up', label: 'Tilt up' },
	{ id: 'down', label: 'Tilt down' },
	{ id: 'left', label: 'Pan left' },
	{ id: 'right', label: 'Pan right' },
	{ id: 'up_left', label: 'Up and left' },
	{ id: 'up_right', label: 'Up and right' },
	{ id: 'down_left', label: 'Down and left' },
	{ id: 'down_right', label: 'Down and right' },
	{ id: 'zoom_in', label: 'Zoom in (tele)' },
	{ id: 'zoom_out', label: 'Zoom out (wide)' },
	{ id: 'focus_near', label: 'Focus near' },
	{ id: 'focus_far', label: 'Focus far' },
]

/** Which movements a direction uses, and which way: pan right, tilt up, zoom in, focus far are positive */
const DIRECTIONS: Record<Direction, Partial<Motion>> = {
	up: { tilt: 1 },
	down: { tilt: -1 },
	left: { pan: -1 },
	right: { pan: 1 },
	up_left: { pan: -1, tilt: 1 },
	up_right: { pan: 1, tilt: 1 },
	down_left: { pan: -1, tilt: -1 },
	down_right: { pan: 1, tilt: -1 },
	zoom_in: { zoom: 1 },
	zoom_out: { zoom: -1 },
	focus_near: { focus: -1 },
	focus_far: { focus: 1 },
}

/**
 * The fractions of top speed to send for a direction at a speed in percent. Diagonals move pan and tilt
 * together; either can be left out of the request, and PTZ Pilot keeps whatever it had for it.
 */
export function directionToFractions(direction: string, speedPercent: number): Partial<Motion> {
	const signs = DIRECTIONS[direction as Direction]
	if (!signs) return {}
	const speed = Math.min(Math.max(Number(speedPercent) || 0, 1), 100) / 100
	const out: Partial<Motion> = {}
	for (const [key, sign] of Object.entries(signs) as [keyof Motion, number][]) out[key] = sign * speed
	return out
}

export type StopWhich = 'all' | 'pan_tilt' | 'zoom' | 'focus'

export const STOP_CHOICES: { id: StopWhich; label: string }[] = [
	{ id: 'all', label: 'Everything' },
	{ id: 'pan_tilt', label: 'Pan and tilt' },
	{ id: 'zoom', label: 'Zoom' },
	{ id: 'focus', label: 'Focus' },
]

/**
 * What stopping a direction means: only the movements that direction used, so releasing a zoom button
 * doesn't stop a pan that another button is holding.
 */
export function stopFractionsFor(which: string): Partial<Motion> | 'all' {
	switch (which) {
		case 'pan_tilt':
			return { pan: 0, tilt: 0 }
		case 'zoom':
			return { zoom: 0 }
		case 'focus':
			return { focus: 0 }
		default:
			return 'all'
	}
}

export function stopForDirection(direction: string): StopWhich {
	if (direction === 'zoom_in' || direction === 'zoom_out') return 'zoom'
	if (direction === 'focus_near' || direction === 'focus_far') return 'focus'
	return 'pan_tilt'
}

// --- Dropdown choices ----------------------------------------------------------------

export function cameraChoices(
	state: ModuleState,
	options: { selected?: boolean; none?: boolean } = {},
): DropdownChoice[] {
	const choices: DropdownChoice[] = []
	if (options.selected) choices.push({ id: SELECTED_CAMERA, label: 'Camera selected in PTZ Pilot' })
	if (options.none) choices.push({ id: NO_CAMERA, label: 'No camera' })
	for (const camera of state.cameras) choices.push({ id: camera.id, label: `${camera.number}: ${camera.name}` })
	return choices
}

export function controllerChoices(state: ModuleState): DropdownChoice[] {
	return state.controllers.map((c) => ({ id: c.id, label: c.connected ? c.name : `${c.name} (disconnected)` }))
}
