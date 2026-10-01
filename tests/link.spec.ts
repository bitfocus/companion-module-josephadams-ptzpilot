import { afterEach, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import type { AddressInfo } from 'node:net'
import { Link } from '../src/link.js'
import type { ServerMessage } from '../src/state.js'

const sleep = async (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('link', () => {
	let server: WebSocketServer | undefined
	let link: Link | undefined

	afterEach(async () => {
		link?.close()
		await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
	})

	it('receives messages, sends requests, and reconnects after a drop', async () => {
		server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
		await new Promise((r) => server!.once('listening', r))
		const port = (server.address() as AddressInfo).port

		const received: unknown[] = []
		let connections = 0
		server.on('connection', (socket) => {
			connections++
			socket.send(JSON.stringify({ type: 'hello', app: 'PTZ Pilot', version: '1.2.3', apiVersion: 1 }))
			socket.on('message', (data: Buffer) => received.push(JSON.parse(data.toString('utf8'))))
		})

		const messages: ServerMessage[] = []
		let opens = 0
		link = new Link({
			url: `ws://127.0.0.1:${port}`,
			onMessage: (m) => messages.push(m),
			onOpen: () => opens++,
			onClose: () => undefined,
			onStatus: () => undefined,
			log: () => undefined,
		})
		link.open()
		await sleep(150)

		expect(link.isConnected).toBe(true)
		expect(messages[0]).toMatchObject({ type: 'hello', version: '1.2.3' })
		expect(link.send({ type: 'home' })).toBe(true)
		await sleep(50)
		expect(received).toEqual([{ type: 'home' }])

		// Drop every client: the link should notice and come back by itself
		for (const client of server.clients) client.terminate()
		await sleep(100)
		expect(link.isConnected).toBe(false)
		expect(link.send({ type: 'home' })).toBe(false)
		await sleep(2400)
		expect(link.isConnected).toBe(true)
		expect(opens).toBe(2)
		expect(connections).toBe(2)
	}, 10_000)
})
