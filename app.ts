import { TelnetServer } from "./lib/telnet";

new TelnetServer(25, async (ts, ns) => {
    const d = {
        hostname: '',
        from: '',
        to: '',
        content: null as Buffer
    }
    await ts.writeString('220 Wellcom MX Pch18 Server')

    d.hostname = await ts.readStringMatch(/^EHLO (.*)/i, 1)
    await ts.writeString('250 OK')

    d.from = await ts.readStringMatch(/^MAIL FROM:.*?<(.*?)>/i, 1)
    await ts.writeString('250 OK')

    d.to = await ts.readStringMatch(/^RCPT TO:.*?<(.*?)>/i, 1)
    await ts.writeString('250 OK')

    await ts.readStringMatch(/^DATA/i)
    await ts.writeString('354 End data with <CR><LF>.<CR><LF>')

    d.content = await ts.readUntil('\r\n.\r\n')
    await ts.writeString('250 Ok: queued as')

    console.log(d)
})