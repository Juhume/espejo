import { db, generateId, type Entry } from "./db"
import { subDays, format } from "date-fns"

const DEMO_MOODS = ["calma", "alegría", "tristeza", "ansiedad", "gratitud", "cansancio", "energía", "foco"]

const DEMO_CONTENT_TEMPLATES = [
  "Hoy ha sido un día interesante. Me desperté temprano y decidí aprovechar la mañana para {activity}. La verdad es que me sentí {feeling} después de hacerlo.",
  "No tengo mucho que escribir hoy. Solo que {simple_thought}.",
  "Reflexionando sobre la semana, me doy cuenta de que {realization}. Es algo que quiero trabajar más.",
  "Hoy me he dado cuenta de que {insight}. Lo mejor del día fue {best_thing}.",
  "Día tranquilo. Pasé la mañana {morning_activity} y la tarde {afternoon_activity}. Me siento {evening_feeling}.",
  "Tuve una conversación interesante con {person} sobre {topic}. Me hizo pensar en {reflection}.",
  "Hoy no ha sido fácil. {challenge}. Pero al final del día, {resolution}.",
  "Pequeñas victorias hoy: {victory1}, {victory2}. A veces son las cosas pequeñas las que importan.",
  "Me desperté sin mucha energía, pero {turning_point}. La tarde mejoró cuando {improvement}.",
  "Día productivo. Conseguí {achievement}. También avancé con {progress}. Mañana quiero {tomorrow}.",
]

const DEMO_FILLERS: Record<string, string[]> = {
  activity: [
    "leer un rato",
    "hacer ejercicio",
    "meditar",
    "escribir",
    "salir a caminar",
    "ordenar el espacio",
    "cocinar algo nuevo",
  ],
  feeling: [
    "más centrado",
    "con energía",
    "tranquilo",
    "motivado",
    "en paz",
    "agradecido",
    "descansado",
    "con claridad",
  ],
  simple_thought: [
    "necesito descansar más",
    "echo de menos a mi familia",
    "tengo ganas de viajar",
    "estoy bien así",
    "mañana será otro día",
  ],
  realization: [
    "estoy siendo muy duro conmigo mismo",
    "necesito más tiempo para mí",
    "he avanzado más de lo que pensaba",
    "las pequeñas cosas importan",
    "el descanso es productivo",
  ],
  insight: [
    "no todo tiene que ser perfecto",
    "está bien pedir ayuda",
    "mi energía es limitada",
    "la constancia supera la intensidad",
  ],
  best_thing: [
    "una buena conversación",
    "terminar algo pendiente",
    "un café tranquilo",
    "hacer ejercicio",
    "leer algo inspirador",
  ],
  morning_activity: [
    "leyendo",
    "trabajando en el proyecto",
    "haciendo recados",
    "entrenando",
    "descansando",
    "ordenando la casa",
  ],
  afternoon_activity: ["con amigos", "viendo una serie", "paseando", "trabajando", "cocinando", "leyendo"],
  evening_feeling: ["satisfecho", "cansado pero bien", "en paz", "agradecido", "pensativo", "tranquilo"],
  person: ["un amigo", "mi pareja", "un colega", "mi familia", "alguien nuevo"],
  topic: ["el futuro", "nuestros planes", "lo que realmente importa", "cómo mejorar", "cambios que queremos hacer"],
  reflection: ["mis prioridades", "lo que quiero de verdad", "cómo uso mi tiempo", "mis relaciones", "mi bienestar"],
  challenge: [
    "Mucho estrés con el trabajo",
    "Me sentí abrumado",
    "No conseguí concentrarme",
    "Tuve un momento difícil",
    "La ansiedad apareció",
  ],
  resolution: [
    "conseguí calmarme",
    "hablé con alguien y ayudó",
    "respiré y seguí adelante",
    "acepté que no todos los días son buenos",
  ],
  victory1: [
    "terminé una tarea pendiente",
    "hice ejercicio",
    "comí bien",
    "dormí suficiente",
    "leí un rato",
    "salí a caminar",
  ],
  victory2: [
    "no miré el móvil tanto",
    "tuve una buena conversación",
    "me organicé mejor",
    "descansé cuando lo necesité",
  ],
  turning_point: [
    "el café ayudó",
    "salí a caminar y mejoró todo",
    "me permití ir más lento",
    "una buena noticia cambió el día",
  ],
  improvement: ["terminé algo importante", "tuve tiempo para mí", "conecté con alguien", "descansé un poco"],
  achievement: ["terminar el informe", "avanzar en el proyecto", "organizar mi espacio", "hacer todas las tareas"],
  progress: ["la lectura del mes", "mis objetivos de ejercicio", "aprender algo nuevo", "mejorar un hábito"],
  tomorrow: ["mantener el ritmo", "descansar más", "ser más amable conmigo", "seguir avanzando"],
}

const DEMO_ONELINERS = [
  "La calma llega cuando dejas de buscarla.",
  "Pequeños pasos, grandes cambios.",
  "Hoy elegí estar presente.",
  "El descanso también es productivo.",
  "Agradecer transforma todo.",
  "Un día a la vez.",
  "La constancia supera la perfección.",
  "Soltar para avanzar.",
  "Escuchar más, hablar menos.",
  "El progreso no siempre es visible.",
]

function fillTemplate(template: string): string {
  let result = template
  const placeholders = template.match(/\{(\w+)\}/g) || []

  placeholders.forEach((placeholder) => {
    const key = placeholder.slice(1, -1)
    const options = DEMO_FILLERS[key]
    if (options) {
      const random = options[Math.floor(Math.random() * options.length)]
      result = result.replace(placeholder, random)
    }
  })

  return result
}

function randomBool(probability = 0.5): boolean {
  return Math.random() < probability
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomMoods(): string[] {
  if (randomBool(0.3)) return [] // 30% chance no mood
  const count = randomBool(0.6) ? 1 : 2
  const shuffled = [...DEMO_MOODS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function generateDemoData(days = 90): Promise<number> {
  const entries: Entry[] = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    // Skip some days randomly (about 30%)
    if (randomBool(0.3)) continue

    const date = subDays(today, i)
    const dateStr = format(date, "yyyy-MM-dd")

    // Pick a random template
    const template = DEMO_CONTENT_TEMPLATES[Math.floor(Math.random() * DEMO_CONTENT_TEMPLATES.length)]
    const content = fillTemplate(template)

    const moodTags = randomMoods()

    const entry: Entry = {
      id: generateId(),
      date: dateStr,
      createdAt: date.getTime(),
      updatedAt: date.getTime(),
      content,
      moodTags,
      habits: {
        exercise: randomBool(0.4)
          ? {
              done: true,
              type: (["strength", "run", "mobility", "other"] as const)[randomInt(0, 3)],
              durationMin: randomInt(20, 60),
              intensity: randomInt(2, 5),
            }
          : { done: false },
        reading: randomBool(0.5) ? { done: true, minutes: randomInt(10, 45) } : { done: false },
        sleep: { rating: randomInt(2, 5), hours: randomInt(5, 9) },
        wellbeing: { rating: randomInt(2, 5) },
      },
      highlights: {
        oneLiner: randomBool(0.3) ? DEMO_ONELINERS[randomInt(0, DEMO_ONELINERS.length - 1)] : undefined,
      },
      wordCount: content.split(/\s+/).filter(Boolean).length,
    }

    entries.push(entry)
  }

  // Clear existing data and add demo entries
  await db.entries.clear()
  await db.reviews.clear()
  await db.entries.bulkAdd(entries)

  // Update settings to demo mode
  const settings = await db.settings.get("main")
  if (settings) {
    await db.settings.put({ ...settings, isDemoMode: true })
  }

  return entries.length
}

export async function clearDemoData(): Promise<void> {
  await db.entries.clear()
  await db.reviews.clear()

  const settings = await db.settings.get("main")
  if (settings) {
    await db.settings.put({ ...settings, isDemoMode: false })
  }
}

export async function isDemoMode(): Promise<boolean> {
  const settings = await db.settings.get("main")
  return settings?.isDemoMode || false
}
