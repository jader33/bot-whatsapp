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
            text: "👋 Hola! Bienvenido a Afrossur.\n\n¿En qué curso estás interesado?\n1️⃣ Vigilancia\n2️⃣ Bachillerato acelerado"
        })
        user.step = 1
        break

    // 🟡 ELECCIÓN CURSO
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
                text: `🎓 Bachillerato Acelerado por ciclos CLEI

Para ubicarte correctamente:

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
            await sock.sendMessage(sender, { text: "Escribe un número del 1 al 6" })
        }
        break

    // 🟣 EDAD BACHILLERATO
    case 3:
        const edadB = parseInt(text)

        if (edadB < 15 || edadB > 60) {
            await sock.sendMessage(sender, {
                text: "⚠️ Edad permitida: 15 a 60 años"
            })
            return
        }

        user.age = edadB

        await sock.sendMessage(sender, {
            text: "📝 Escribe tu nombre completo"
        })

        user.step = 4
        break

    // 🧑 NOMBRE BACHILLERATO
    case 4:
        user.name = text

        await sock.sendMessage(sender, {
            text: "💻 Modalidad:\n1️⃣ Virtual\n2️⃣ Presencial"
        })

        user.step = 5
        break

    // 🎓 MODALIDAD BACHILLERATO
    case 5:
        user.mode = text === "1" ? "Virtual" : "Presencial"

        await sock.sendMessage(sender, {
            text: `✅ Registro completo

Nombre: ${user.name}
Curso: Bachillerato
CLEI: ${user.clei}
Edad: ${user.age}
Modalidad: ${user.mode}

📲 Un asesor te contactará`
        })

        console.log("📊 CLIENTE:", user)
        user.step = 99
        break

    // 🔐 TIPO CURSO VIGILANCIA
    case 10:
        const tipos = ["Básico", "Escolta", "Renovación", "Medios tecnológicos"]

        if (text >= 1 && text <= 4) {
            user.type = tipos[text - 1]

            await sock.sendMessage(sender, {
                text: "📅 ¿Qué edad tienes?"
            })

            user.step = 11
        } else {
            await sock.sendMessage(sender, { text: "Responde 1 a 4" })
        }
        break

    // 🟠 EDAD VIGILANCIA
    case 11:
        const edadV = parseInt(text)

        if (edadV < 18 || edadV > 60) {
            await sock.sendMessage(sender, {
                text: "⚠️ Edad permitida: 18 a 60 años"
            })
            return
        }

        user.age = edadV

        await sock.sendMessage(sender, {
            text: "📝 Escribe tu nombre completo"
        })

        user.step = 12
        break

    // 🧑 NOMBRE VIGILANCIA
    case 12:
        user.name = text

        await sock.sendMessage(sender, {
            text: "💻 Modalidad:\n1️⃣ Virtual\n2️⃣ Presencial"
        })

        user.step = 13
        break

    // 🎯 MODALIDAD VIGILANCIA
    case 13:
        user.mode = text === "1" ? "Virtual" : "Presencial"

        await sock.sendMessage(sender, {
            text: `✅ Registro completo

Nombre: ${user.name}
Curso: ${user.type}
Edad: ${user.age}
Modalidad: ${user.mode}

📲 Un asesor te contactará`
        })

        console.log("📊 CLIENTE:", user)
        user.step = 99
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