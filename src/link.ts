import { InstanceStatus, type LogLevel } from '@companion-module/base'
import WebSocket from 'ws'
import type { ServerMessage } from './state.js'

/** How long to wait before trying again after the connection drops or fails */
const RECONNECT_DELAY = 2000
/** PTZ Pilot answers pings; if a connection goes this long without one, it is treated as dead */
const PING_INTERVAL = 5000

export interface LinkOptions {
	url: string
	onMessage: (message: ServerMessage) => void
	onOpen: () => void
	onClose: () => void
	onStatus: (status: InstanceStatus, message?: string) => void
	log: (level: LogLevel, message: string) => void
}

/** The WebSocket to PTZ Pilot, reconnecting until closed */
export class Link {
	readonly #options: LinkOptions
	#socket: WebSocket | undefined
	#reconnect: NodeJS.Timeout | undefined
	#ping: NodeJS.Timeout | undefined
	#alive = false
	#closed = false
	/** Only log a failure once per outage, not every two seconds */
	#reportedFailure = false

	constructor(options: LinkOptions) {
		this.#options = options
	}

	get isConnected(): boolean {
		return this.#socket?.readyState === WebSocket.OPEN
	}

	open(): void {
		this.#closed = false
		this.#connect()
	}

	close(): void {
		this.#closed = true
		clearTimeout(this.#reconnect)
		clearInterval(this.#ping)
		this.#socket?.removeAllListeners()
		this.#socket?.terminate()
		this.#socket = undefined
	}

	/** @returns false if the message could not be sent because the link is down */
	send(message: object): boolean {
		if (!this.isConnected) return false
		this.#socket!.send(JSON.stringify(message))
		return true
	}

	#connect(): void {
		if (this.#closed) return
		this.#options.onStatus(InstanceStatus.Connecting)

		const socket = new WebSocket(this.#options.url, { handshakeTimeout: 5000 })
		this.#socket = socket
		let opened = false

		socket.on('open', () => {
			opened = true
			this.#reportedFailure = false
			this.#alive = true
			this.#options.onStatus(InstanceStatus.Ok)
			this.#options.log('info', `Connected to PTZ Pilot at ${this.#options.url}`)
			this.#ping = setInterval(() => this.#checkAlive(), PING_INTERVAL)
			this.#options.onOpen()
		})

		socket.on('pong', () => (this.#alive = true))

		socket.on('message', (data) => {
			let message: ServerMessage
			try {
				// ws hands over a Buffer, an ArrayBuffer or an array of Buffers, depending on the frame
				const text = Array.isArray(data) ? Buffer.concat(data).toString() : Buffer.from(data as ArrayBuffer).toString()
				message = JSON.parse(text)
			} catch {
				this.#options.log('warn', 'PTZ Pilot sent something that is not JSON')
				return
			}
			this.#options.onMessage(message)
		})

		socket.on('error', (error: NodeJS.ErrnoException) => {
			if (this.#reportedFailure) return
			this.#reportedFailure = true
			const message =
				error.code === 'ECONNREFUSED' ? 'PTZ Pilot is not running, or its API is off or on another port' : error.message
			this.#options.log('warn', `Could not reach PTZ Pilot: ${message}`)
			this.#options.onStatus(InstanceStatus.ConnectionFailure, message)
		})

		socket.on('close', () => {
			clearInterval(this.#ping)
			if (this.#socket === socket) this.#socket = undefined
			if (opened) {
				this.#options.log('warn', 'Lost connection to PTZ Pilot')
				this.#options.onStatus(InstanceStatus.Disconnected)
			}
			this.#options.onClose()
			if (!this.#closed) this.#reconnect = setTimeout(() => this.#connect(), RECONNECT_DELAY)
		})
	}

	#checkAlive(): void {
		const socket = this.#socket
		if (!socket) return
		if (!this.#alive) {
			socket.terminate()
			return
		}
		this.#alive = false
		socket.ping()
	}
}
