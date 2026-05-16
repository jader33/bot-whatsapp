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
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`

    console.log("🔗 ABRE ESTE LINK PARA ESCANEAR EL QR:")
    console.log(qrLink)
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

    // 🟢 INICIO
    case 0:
        await sock.sendMessage(sender, {
            text: "👋 Hola! Bienvenido a Afrossur.\n\n¿Quieres información de:\n1️⃣ Vigilancia\n2️⃣ Bachillerato acelerado?"
        })
        user.step = 1
        break

    // 🟡 ELECCIÓN DE CURSO
    case 1:
        if (text === "1" || text.toLowerCase().includes("vigilancia")) {
            user.course = "Vigilancia"

            await sock.sendMessage(sender, {
                text: "📅 ¿Qué edad tienes?"
            })

            user.step = 5 // flujo diferente
            return

        } else if (text === "2" || text.toLowerCase().includes("bachillerato")) {
            user.course = "Bachillerato"

            await sock.sendMessage(sender, {
                text: `🎓 *Bachillerato Acelerado por ciclos CLEI*

Para ubicarte correctamente, dinos hasta qué nivel llegaste:

1️⃣ CLEI 1 → 1°, 2° y 3°
2️⃣ CLEI 2 → 4° y 5°
3️⃣ CLEI 3 → 6° y 7°
4️⃣ CLEI 4 → 8° y 9°
5️⃣ CLEI 5 → Grado 10°
6️⃣ CLEI 6 → Grado 11°

👉 Escribe el número del CLEI en el que terminaste`
            })

            user.step = 2
            return

        } else {
            await sock.sendMessage(sender, { text: "Por favor responde 1 o 2" })
            return
        }

    // 🔵 CLEI
    case 2:
        const clei = parseInt(text)

        if (clei >= 1 && clei <= 6) {
            user.clei = clei

            await sock.sendMessage(sender, {
                text: "📅 ¿Qué edad tienes?"
            })

            user.step = 3
        } else {
            await sock.sendMessage(sender, {
                text: "❌ Por favor escribe un número del 1 al 6"
            })
        }
        break

    // 🟣 EDAD CON VALIDACIÓN
    case 3:
    case 5: // vigilancia también usa este paso

        const edad = parseInt(text)

        if (isNaN(edad)) {
            await sock.sendMessage(sender, {
                text: "❌ Por favor escribe una edad válida (solo números)"
            })
            return
        }

        if (edad < 15 || edad > 60) {
            await sock.sendMessage(sender, {
                text: "⚠️ Nuestros programas están disponibles para personas entre 15 y 60 años.\n\nSi deseas más información, un asesor puede ayudarte."
            })
            user.step = 4
            return
        }

        user.age = edad

        // flujo bachillerato
        if (user.course === "Bachillerato") {

            await sock.sendMessage(sender, {
                text: `✅ Gracias!\n\nCurso: Bachillerato\nCLEI: ${user.clei}\nEdad: ${user.age}\n\nUn asesor te contactará pronto.`
            })

        } else {
            // flujo vigilancia
            await sock.sendMessage(sender, {
                text: `✅ Gracias!\n\nCurso: Vigilancia\nEdad: ${user.age}\n\nUn asesor te contactará pronto.`
            })
        }

        console.log("📊 NUEVO CLIENTE:", user)

        user.step = 4
        break

    // ⚪ FINAL
    default:
        await sock.sendMessage(sender, {
            text: "👍 Ya tenemos tus datos, pronto te contactamos."
        })
        break
}
})
}

startBot()