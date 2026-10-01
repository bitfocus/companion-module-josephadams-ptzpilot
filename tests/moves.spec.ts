import { describe, expect, it } from 'vitest'
import { directionToFractions, stopForDirection, stopFractionsFor, cameraChoices } from '../src/moves.js'
import { createState, findCamera, findController, SELECTED_CAMERA } from '../src/state.js'

describe('directions', () => {
	it('scale by speed, with up and right positive', () => {
		expect(directionToFractions('up', 50)).toEqual({ tilt: 0.5 })
		expect(directionToFractions('left', 100)).toEqual({ pan: -1 })
		expect(directionToFractions('down_right', 25)).toEqual({ pan: 0.25, tilt: -0.25 })
		expect(directionToFractions('zoom_out', 100)).toEqual({ zoom: -1 })
		expect(directionToFractions('focus_far', 10)).toEqual({ focus: 0.1 })
	})

	it('clamp the speed to 1-100%', () => {
		expect(directionToFractions('up', 500)).toEqual({ tilt: 1 })
		expect(directionToFractions('up', 0)).toEqual({ tilt: 0.01 })
	})

	it('ignore unknown directions', () => {
		expect(directionToFractions('sideways', 50)).toEqual({})
	})

	it('stop only what a direction moved', () => {
		expect(stopForDirection('up_left')).toBe('pan_tilt')
		expect(stopForDirection('zoom_in')).toBe('zoom')
		expect(stopFractionsFor('pan_tilt')).toEqual({ pan: 0, tilt: 0 })
		expect(stopFractionsFor('zoom')).toEqual({ zoom: 0 })
		expect(stopFractionsFor('all')).toBe('all')
	})
})

describe('finding cameras and controllers', () => {
	const state = createState()
	state.activeCamera = 'b'
	state.cameras = [
		{
			id: 'a',
			number: 1,
			name: 'Stage Left',
			protocol: 'sony-udp',
			address: '',
			status: 'responding',
			controllers: [],
		},
		{ id: 'b', number: 2, name: 'Stage Right', protocol: 'tcp', address: '', status: 'waiting', controllers: [] },
	]
	state.controllers = [
		{ id: 'hid:1', name: 'Xbox Wireless Controller', kind: 'gamepad', connected: true, live: true, camera: 'a' },
	]

	it('by id, name (any case) or number', () => {
		expect(findCamera(state, 'a')?.name).toBe('Stage Left')
		expect(findCamera(state, 'stage right')?.id).toBe('b')
		expect(findCamera(state, 1)?.id).toBe('a')
		expect(findCamera(state, '2')?.id).toBe('b')
		expect(findCamera(state, 'nope')).toBeUndefined()
	})

	it('"selected" means the camera PTZ Pilot is showing', () => {
		expect(findCamera(state, SELECTED_CAMERA)?.id).toBe('b')
		expect(findCamera(state, '')?.id).toBe('b')
	})

	it('controllers by id or name', () => {
		expect(findController(state, 'hid:1')?.name).toBe('Xbox Wireless Controller')
		expect(findController(state, 'xbox wireless controller')?.id).toBe('hid:1')
	})

	it('choices list cameras by number, with the special entries first', () => {
		expect(cameraChoices(state, { selected: true, none: true }).map((c) => c.id)).toEqual([
			'selected',
			'none',
			'a',
			'b',
		])
		expect(cameraChoices(state)[0].label).toBe('1: Stage Left')
	})
})
