const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state
    })

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
            console.log("🔗 ESCANEA ESTE QR:")
            console.log(qrLink)
        }

        if (connection === "close") {
            const shouldReconnect =
                (new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) startBot()

        } else if (connection === "open") {
            console.log("✅ BOT CONECTADO")
        }
    })

    sock.ev.on("creds.update", saveCreds)

    const users = {}

    sock.ev.on("messages.upsert", async ({ messages, type }) => {

        if (type !== "notify") return

        const msg = messages[0]

        if (!msg.message) return
        if (msg.key.fromMe) return
        if (msg.key.remoteJid.endsWith("@g.us")) return

        const sender = msg.key.remoteJid

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            ""

        if (!text) return

        if (!users[sender]) users[sender] = { step: 0 }

        const user = users[sender]

        switch (user.step) {

            case 0:
                await sock.sendMessage(sender, {
                    text: "👋 Hola! Bienvenido a Afrossur.\n\n¿En qué curso estás interesado?\n1️⃣ Vigilancia\n2️⃣ Bachillerato acelerado"
                })
                user.step = 1
                break

            case 1:
                if (text === "1" || text.toLowerCase().includes("vigilancia")) {

                    user.course = "Vigilancia"

                    await sock.sendMessage(sender, {
                        text: "🔐 ¿Qué tipo de curso deseas?\n\n1️⃣ Básico\n2️⃣ Escolta\n3️⃣ Renovación\n4️⃣ Medios tecnológicos"
                    })

                    user.step = 10
                    return

                } else if (text === "2" || text.toLowerCase().includes("bachillerato")) {

                    user.course = "Bachillerato"

                    await sock.sendMessage(sender, {
                        image: {
                            url: "https://drive.google.com/uc?export=view&id=1ZE2edgQa65p3xyD05loQ4zqjF7v9D_UV"                        },
                        caption: `🎓 Bachillerato CLEI

1️⃣ CLEI 1 → 1°, 2° y 3°
2️⃣ CLEI 2 → 4° y 5°
3️⃣ CLEI 3 → 6° y 7°
4️⃣ CLEI 4 → 8° y 9°
5️⃣ CLEI 5 → 10°
6️⃣ CLEI 6 → 11°

👉 Escribe el número`
                    })

                    user.step = 2
                    return

                } else {
                    await sock.sendMessage(sender, { text: "Responde 1 o 2" })
                    return
                }

            case 2:
                const clei = parseInt(text)

                if (isNaN(clei) || clei < 1 || clei > 6) {
                    await sock.sendMessage(sender, { text: "Escribe un número del 1 al 6" })
                    return
                }

                user.clei = clei

                await sock.sendMessage(sender, {
                    text: "📅 ¿Qué edad tienes?"
                })

                user.step = 3
                break

            case 3:
                const edadB = parseInt(text)

                if (isNaN(edadB) || edadB < 15 || edadB > 60) {
                    await sock.sendMessage(sender, {
                        text: "⚠️ Edad válida entre 15 y 60 años"
                    })
                    return
                }

                user.age = edadB

                await sock.sendMessage(sender, {
                    text: "📝 Escribe tu nombre completo"
                })

                user.step = 4
                break

            case 4:
                user.name = text

                await sock.sendMessage(sender, {
                    text: "💻 Modalidad:\n1️⃣ Virtual\n2️⃣ Presencial"
                })

                user.step = 5
                break

            case 5:
                user.mode = text === "1" ? "Virtual" : "Presencial"

                await sock.sendMessage(sender, {
                    text: `✅ Registro completo

Nombre: ${user.name}
Curso: Bachillerato
CLEI: ${user.clei}
Edad: ${user.age}
Modalidad: ${user.mode}`
                })

                user.step = 99
                break

            case 10:
                const opcion = parseInt(text)
                const tipos = ["Básico", "Escolta", "Renovación", "Medios tecnológicos"]

                if (isNaN(opcion) || opcion < 1 || opcion > 4) {
                    await sock.sendMessage(sender, { text: "Responde 1 a 4" })
                    return
                }

                user.type = tipos[opcion - 1]

                await sock.sendMessage(sender, {
                    text: "📅 ¿Qué edad tienes?"
                })

                user.step = 11
                break

            case 11:
                const edadV = parseInt(text)

                if (isNaN(edadV) || edadV < 18 || edadV > 60) {
                    await sock.sendMessage(sender, {
                        text: "⚠️ Edad válida entre 18 y 60 años"
                    })
                    return
                }

                user.age = edadV

                await sock.sendMessage(sender, {
                    text: "📝 Escribe tu nombre completo"
                })

                user.step = 12
                break

            case 12:
                user.name = text

                await sock.sendMessage(sender, {
                    text: "💻 Modalidad:\n1️⃣ Virtual\n2️⃣ Presencial"
                })

                user.step = 13
                break

            case 13:
                user.mode = text === "1" ? "Virtual" : "Presencial"

                await sock.sendMessage(sender, {
                    text: `✅ Registro completo

Nombre: ${user.name}
Curso: ${user.type}
Edad: ${user.age}
Modalidad: ${user.mode}`
                })

                user.step = 99
                break

            default:
                await sock.sendMessage(sender, {
                    text: "👍 Ya tenemos tus datos, pronto te contactamos."
                })
                break
        }
    })
}

startBot()