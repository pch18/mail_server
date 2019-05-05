import net = require('net');
class TelnetSocket {
    netSocket: net.Socket
    constructor(netSocket: TelnetSocket['netSocket']) {
        this.netSocket = netSocket
    }
    close() {
        this.netSocket.end()
        this.netSocket.removeAllListeners()
    }
    wait(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms))
    }
    writeBuffer(data: Buffer) {
        return new Promise<void>((resolve, reject) => {
            const resolve_callback = (err?: Error) => {
                this.netSocket.removeListener('error', reject)
                err ? reject(err) : resolve()
            }
            this.netSocket.once('error', reject)
            this.netSocket.write(data, resolve_callback)
        })
    }
    readBuffer() {
        return new Promise<Buffer>((resolve, reject) => {
            const resolve_callback = (data: Buffer) => {
                this.netSocket.removeListener('error', reject)
                resolve(data)
            }
            this.netSocket.once('error', reject)
            this.netSocket.once('data', resolve_callback)
        })
    }
    async writeString(data: string, lineFeed = true) {
        return await this.writeBuffer(Buffer.from(lineFeed ? data + '\r\n' : data))
    }
    async readString() {
        return (await this.readBuffer()).toString()
    }
    async readStringMatch(regExp: RegExp): Promise<RegExpMatchArray>
    async readStringMatch(regExp: RegExp, getIndex: number): Promise<string>
    async readStringMatch(...avgs: any[]) {
        const regExp = avgs[0]
        const getIndex = avgs[1]
        const str = await this.readString()
        const match = str.match(regExp)
        if (match) {
            if (getIndex) {
                return match[getIndex]
            } else {
                return match
            }
        } else {
            throw new Error(`使用 /${regExp.source}/${regExp.flags} 匹配文本失败: ${str}`)
        }
    }
    async readUntil(find_str: string) {
        const find_bf = Buffer.from(find_str)
        let new_bf = await this.readBuffer()
        let all_bf = new_bf
        while (!all_bf.includes(find_bf, find_bf.length * -2)) {
            new_bf = await this.readBuffer()
            all_bf = Buffer.concat([all_bf, new_bf]);
        }
        return all_bf
    }

}

export class TelnetServer {
    private netServer: net.Server
    private config = {
        showLog: false
    }
    constructor(port: number, callback: (telnetSocket: TelnetSocket, netSocket: net.Socket) => Promise<void>) {
        this.netServer = net.createServer((netSocket: net.Socket) => {
            this.config.showLog && console.log(`收到新的连接 ${netSocket.remoteAddress}:${netSocket.remotePort}`)
            netSocket.on('error', () => {
                telnetSocket.close()
            })
            if (this.config.showLog) {
                netSocket.on('data', (data) => {
                    console.log(`收到来自服务器消息 ${netSocket.remoteAddress}:${netSocket.remotePort}\n`, data.toString())
                })
            }
            const telnetSocket = new TelnetSocket(netSocket)
            callback(telnetSocket, netSocket).then(() => {
                telnetSocket.close()
                this.config.showLog && console.log(`回调跑完关闭端口 ${netSocket.remoteAddress}:${netSocket.remotePort}`)
            }).catch((e) => {
                telnetSocket.close()
                this.config.showLog && console.error(`回调中途出错 ${netSocket.remoteAddress}:${netSocket.remotePort}\n`, e)
            })

        })
        this.netServer.on('error', (e) => {
            e.message = `侦听${port}端口失败: ` + e.message
            throw e
        })
        this.netServer.listen(port, () => {
            console.info(`侦听${port}端口成功, 开始运行服务`)
        })
    }
    showLog() {
        this.config.showLog = true
    }

}

// export const telnetServer = (port: number, callback: (client: telnetSocket) => Promise<void>) => {

// }