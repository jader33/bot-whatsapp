const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const qrcode = require("qrcode-terminal")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state
    })

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update

        // 🔥 MOSTRAR QR MANUALMENTE
        if (qr) {
            console.log("📱 Escanea este QR:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "close") {
            const shouldReconnect =
                (new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("❌ Conexión cerrada. Reintentando...", shouldReconnect)

            if (shouldReconnect) {
                startBot()
            }

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

    console.log("📩 Cliente:", sender, "| Mensaje:", text)

    // 👇 CREAR USUARIO SI NO EXISTE
    if (!users[sender]) {
        users[sender] = { step: 0 }
    }

    const user = users[sender]

    // 🔥 FLUJO
    switch (user.step) {

        case 0:
            await sock.sendMessage(sender, {
                text: "👋 Hola! Bienvenido a Afrossur.\n\n¿Quieres información de:\n1️⃣ Vigilancia\n2️⃣ Bachillerato acelerado?"
            })
            user.step = 1
            break

        case 1:
            if (text === "1" || text.toLowerCase().includes("vigilancia")) {
                user.course = "Vigilancia"
            } else if (text === "2" || text.toLowerCase().includes("bachillerato")) {
                user.course = "Bachillerato"
            } else {
                await sock.sendMessage(sender, { text: "Por favor responde 1 o 2" })
                return
            }

            await sock.sendMessage(sender, {
                text: "📅 ¿Qué edad tienes?"
            })
            user.step = 2
            break

        case 2:
            user.age = text

            await sock.sendMessage(sender, {
                text: "🎓 ¿Hasta qué grado estudiaste?"
            })
            user.step = 3
            break

        case 3:
            user.level = text

            await sock.sendMessage(sender, {
                text: `✅ Gracias!\n\nCurso: ${user.course}\nEdad: ${user.age}\nNivel: ${user.level}\n\nUn asesor te contactará pronto.`
            })

            console.log("📊 NUEVO CLIENTE:", user)

            user.step = 4
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