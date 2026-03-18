import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerDef {
  type: "webhook" | "cron" | "manual";
  config?: Record<string, string>;
}

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  trigger: TriggerDef;
  required_credentials: string[];
  nodes: WorkflowNode[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(catIdx: number, varIdx: number): string {
  const catHex = catIdx.toString(16).padStart(4, "0");
  const varHex = varIdx.toString(16).padStart(4, "0");
  return `tmpl-${catHex}-${varHex}-a1b2-c3d4-e5f6${catHex}${varHex}`;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function pickN<T>(arr: T[], start: number, count: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(start + i * 7) % arr.length]);
  }
  return [...new Set(result)];
}

function triggerForIndex(i: number): TriggerDef {
  const types: Array<"webhook" | "cron" | "manual"> = ["webhook", "cron", "manual"];
  const t = types[i % 3];
  if (t === "cron") {
    const schedules = [
      "0 * * * *",
      "0 0 * * *",
      "0 9 * * 1-5",
      "*/30 * * * *",
      "0 0 * * 0",
      "0 8,20 * * *",
      "0 0 1 * *",
      "*/15 * * * *",
      "0 12 * * *",
      "0 6 * * 1",
    ];
    return { type: "cron", config: { schedule: pick(schedules, i) } };
  }
  if (t === "webhook") {
    return { type: "webhook", config: { path: `/hook/tmpl-${i}` } };
  }
  return { type: "manual" };
}

const NODE_TYPES = [
  "http_request",
  "condition",
  "transform",
  "set_variable",
  "delay",
  "email",
  "loop",
] as const;

function generateNodes(
  variantIdx: number,
  credentials: string[],
  nodeCount: number
): WorkflowNode[] {
  const nodes: WorkflowNode[] = [];
  for (let n = 0; n < nodeCount; n++) {
    const nt = pick(NODE_TYPES, variantIdx + n * 3);
    const nodeId = `node_${n + 1}`;
    let config: Record<string, unknown> = {};

    switch (nt) {
      case "http_request":
        config = {
          method: pick(["GET", "POST", "PUT", "PATCH"], variantIdx + n),
          url: `https://api.example.com/v1/${pick(["data", "users", "events", "reports", "items"], variantIdx)}`,
          headers: { "Content-Type": "application/json" },
          auth_ref: credentials.length > 0 ? pick(credentials, variantIdx + n) : undefined,
        };
        break;
      case "condition":
        config = {
          field: pick(["status", "response.code", "data.count", "result.success", "payload.type"], variantIdx + n),
          operator: pick(["eq", "neq", "gt", "lt", "contains"], variantIdx + n),
          value: pick(["200", "true", "0", "active", "error"], variantIdx + n),
          on_true: n + 1 < nodeCount ? `node_${n + 2}` : "end",
          on_false: "end",
        };
        break;
      case "transform":
        config = {
          expression: pick(
            [
              "data.map(item => item.name)",
              "Object.keys(input).filter(k => input[k])",
              "{ ...prev, timestamp: Date.now() }",
              "items.reduce((a, b) => a + b.value, 0)",
              "data.filter(d => d.active)",
            ],
            variantIdx + n
          ),
          output_var: `transformed_${n}`,
        };
        break;
      case "set_variable":
        config = {
          name: pick(["result", "counter", "status", "payload", "batch_id"], variantIdx + n),
          value: pick(["{{prev.output}}", "0", "pending", "{}", "{{env.API_KEY}}"], variantIdx + n),
        };
        break;
      case "delay":
        config = {
          duration_ms: pick([1000, 5000, 10000, 30000, 60000], variantIdx + n),
          reason: pick(["rate_limit", "cooldown", "wait_for_processing", "throttle", "retry_delay"], variantIdx + n),
        };
        break;
      case "email":
        config = {
          to: "{{trigger.email}}",
          subject: pick(
            ["Звіт готовий", "Нове сповіщення", "Результати обробки", "Щоденний дайджест", "Попередження"],
            variantIdx + n
          ),
          body_template: "email_template_" + (variantIdx % 20),
          auth_ref: credentials.includes("gmail")
            ? "gmail"
            : credentials.includes("sendgrid")
              ? "sendgrid"
              : pick(credentials, variantIdx + n),
        };
        break;
      case "loop":
        config = {
          items_ref: pick(["{{data.items}}", "{{result.rows}}", "{{input.list}}", "{{batch}}", "{{records}}"], variantIdx + n),
          max_iterations: pick([10, 50, 100, 200, 500], variantIdx + n),
          batch_size: pick([1, 5, 10, 25], variantIdx + n),
        };
        break;
    }

    nodes.push({ id: nodeId, type: nt, config });
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface CategoryDef {
  name: string;
  namePatterns: string[];
  descriptionPatterns: string[];
  tagPool: string[];
  credentialPool: string[];
}

const categories: CategoryDef[] = [
  // 1. Social Media
  {
    name: "Соціальні мережі",
    namePatterns: [
      "Автопостинг у {platform}",
      "Аналіз залученості в {platform}",
      "Планувальник контенту для {platform}",
      "Моніторинг згадок у {platform}",
      "Автоматичний репост з {platform}",
      "Збір коментарів з {platform}",
      "Масовий постинг у {platform}",
      "Аналітика підписників {platform}",
      "Автовідповідь у {platform}",
      "Кросс-постинг {platform} -> {platform2}",
    ],
    descriptionPatterns: [
      "Автоматизує публікацію контенту у {platform}. Підтримує планування та аналітику.",
      "Збирає та аналізує метрики залученості з {platform} за обраний період.",
      "Планує та публікує контент у {platform} за розкладом.",
      "Відстежує згадки бренду у {platform} та надсилає сповіщення.",
      "Автоматично репостить найпопулярніший контент з {platform}.",
      "Збирає та аналізує коментарі з публікацій у {platform}.",
      "Масово публікує контент у {platform} з черги.",
      "Відстежує зростання підписників та залученість у {platform}.",
      "Надсилає автоматичні відповіді на повідомлення у {platform}.",
      "Автоматично дублює пости з {platform} в інші мережі.",
    ],
    tagPool: ["соціальні мережі", "постинг", "контент", "аналітика", "SMM", "залученість", "підписники", "репост", "моніторинг", "автоматизація"],
    credentialPool: ["instagram", "facebook", "twitter", "telegram", "openai"],
  },
  // 2. Email Marketing
  {
    name: "Email маркетинг",
    namePatterns: [
      "Розсилка {type} листів",
      "Автоматична відповідь на {trigger_desc}",
      "Сегментація {segment} підписників",
      "A/B тестування {element}",
      "Вітальна серія для {audience}",
      "Реактивація {audience}",
      "Тригерна розсилка при {event}",
      "Персоналізація {element} в листах",
      "Очищення бази {action}",
      "Аналіз {metric} розсилок",
    ],
    descriptionPatterns: [
      "Автоматизує розсилку {type} листів за розкладом або тригером.",
      "Надсилає автоматичну відповідь при {trigger_desc} від підписника.",
      "Сегментує базу підписників за {segment} критеріями.",
      "Проводить A/B тестування {element} для оптимізації конверсії.",
      "Надсилає серію вітальних листів новим підписникам.",
      "Повертає неактивних підписників через персоналізовані листи.",
      "Запускає автоматичну розсилку при настанні {event}.",
      "Додає персоналізацію {element} для кожного отримувача.",
      "Очищує базу підписників від {action} адрес.",
      "Аналізує {metric} email-кампаній та генерує звіт.",
    ],
    tagPool: ["email", "розсилка", "маркетинг", "підписники", "конверсія", "сегментація", "A/B тест", "персоналізація", "тригер", "аналітика"],
    credentialPool: ["gmail", "mailchimp", "sendgrid", "openai", "google_sheets"],
  },
  // 3. CRM
  {
    name: "CRM",
    namePatterns: [
      "Синхронізація контактів з {source}",
      "Оновлення {entity} в CRM",
      "Автоматичне створення {entity}",
      "Розподіл {entity} між менеджерами",
      "Нагадування про {action}",
      "Імпорт {entity} з {source}",
      "Дедуплікація {entity}",
      "Збагачення даних {entity}",
      "Відстеження {metric} угод",
      "Автоматизація {stage} воронки",
    ],
    descriptionPatterns: [
      "Синхронізує контакти між {source} та CRM-системою в реальному часі.",
      "Автоматично оновлює {entity} в CRM при зміні даних.",
      "Створює нові {entity} в CRM на основі вхідних даних.",
      "Розподіляє нові {entity} між менеджерами за правилами.",
      "Надсилає нагадування менеджерам про заплановані {action}.",
      "Імпортує {entity} з {source} в CRM з маппінгом полів.",
      "Знаходить та обʼєднує дублікати {entity} в базі.",
      "Доповнює дані {entity} інформацією з зовнішніх джерел.",
      "Відстежує {metric} угод та сповіщує про зміни.",
      "Автоматизує перехід угод на етап {stage} воронки.",
    ],
    tagPool: ["CRM", "контакти", "угоди", "воронка", "менеджери", "синхронізація", "імпорт", "дедуплікація", "автоматизація", "продажі"],
    credentialPool: ["hubspot", "salesforce", "google_sheets", "gmail", "slack"],
  },
  // 4. E-commerce
  {
    name: "E-commerce",
    namePatterns: [
      "Оновлення {entity} в магазині",
      "Синхронізація {entity} з {source}",
      "Сповіщення про {event}",
      "Автоматичне {action} замовлень",
      "Генерація {document} для замовлень",
      "Відстеження {metric} продажів",
      "Обробка {type} повернень",
      "Управління {entity} складу",
      "Автоматична {action} знижок",
      "Інтеграція {payment} платежів",
    ],
    descriptionPatterns: [
      "Автоматично оновлює {entity} в інтернет-магазині.",
      "Синхронізує {entity} між магазином та {source}.",
      "Надсилає сповіщення при {event} в магазині.",
      "Автоматично виконує {action} нових замовлень.",
      "Генерує {document} для кожного замовлення.",
      "Відстежує {metric} продажів та формує звіти.",
      "Обробляє {type} повернення товарів автоматично.",
      "Керує {entity} на складі та сповіщує про залишки.",
      "Автоматично застосовує {action} знижки за правилами.",
      "Інтегрує {payment} платіжну систему з магазином.",
    ],
    tagPool: ["e-commerce", "замовлення", "товари", "склад", "знижки", "повернення", "платежі", "продажі", "магазин", "інтеграція"],
    credentialPool: ["shopify", "stripe", "gmail", "google_sheets", "slack"],
  },
  // 5. Analytics
  {
    name: "Аналітика",
    namePatterns: [
      "Збір {metric} з {source}",
      "Щоденний звіт {metric}",
      "Дашборд {metric} в реальному часі",
      "Порівняння {metric} за періоди",
      "Аналіз {entity} трафіку",
      "Відстеження {metric} конверсій",
      "Когортний аналіз {entity}",
      "Прогнозування {metric}",
      "Аномалії в {metric}",
      "Автоматичний {type} звіт",
    ],
    descriptionPatterns: [
      "Збирає {metric} з {source} та зберігає для аналізу.",
      "Генерує щоденний звіт по {metric} та надсилає команді.",
      "Створює дашборд {metric} з оновленням в реальному часі.",
      "Порівнює {metric} за різні періоди та виявляє тренди.",
      "Аналізує {entity} трафік та визначає джерела.",
      "Відстежує {metric} конверсій по всіх каналах.",
      "Проводить когортний аналіз {entity} за визначеними критеріями.",
      "Прогнозує {metric} на основі історичних даних.",
      "Виявляє аномалії в {metric} та надсилає алерти.",
      "Автоматично генерує {type} звіт за розкладом.",
    ],
    tagPool: ["аналітика", "звіти", "метрики", "дашборд", "конверсії", "трафік", "прогноз", "когорти", "аномалії", "дані"],
    credentialPool: ["google_analytics", "google_sheets", "openai", "slack", "postgresql"],
  },
  // 6. DevOps
  {
    name: "DevOps",
    namePatterns: [
      "Деплой {service} на {env}",
      "Моніторинг {metric} серверів",
      "Автоматичний {action} при помилці",
      "CI/CD пайплайн для {service}",
      "Бекап {entity} баз даних",
      "Масштабування {service}",
      "Ротація {entity} логів",
      "Сповіщення про {event} інфраструктури",
      "Автоматичне {action} контейнерів",
      "Перевірка {check} безпеки",
    ],
    descriptionPatterns: [
      "Автоматизує деплой {service} на {env} середовище.",
      "Моніторить {metric} серверів та сповіщує при перевищенні порогу.",
      "Виконує автоматичний {action} при виникненні помилки.",
      "Запускає CI/CD пайплайн для {service} при кожному коміті.",
      "Створює регулярний бекап {entity} баз даних.",
      "Автоматично масштабує {service} залежно від навантаження.",
      "Виконує ротацію {entity} логів за розкладом.",
      "Надсилає сповіщення команді про {event} в інфраструктурі.",
      "Автоматично виконує {action} Docker-контейнерів.",
      "Перевіряє {check} безпеки системи та генерує звіт.",
    ],
    tagPool: ["DevOps", "деплой", "CI/CD", "моніторинг", "інфраструктура", "контейнери", "бекап", "безпека", "автоматизація", "сервери"],
    credentialPool: ["github", "aws_s3", "slack", "jira", "telegram"],
  },
  // 7. Finance
  {
    name: "Фінанси",
    namePatterns: [
      "Щоденний звіт {metric}",
      "Автоматичне {action} рахунків",
      "Синхронізація {entity} з бухгалтерією",
      "Відстеження {metric} витрат",
      "Розрахунок {metric} прибутку",
      "Генерація {document} документів",
      "Контроль {entity} бюджету",
      "Аналіз {metric} грошових потоків",
      "Автоматична {action} оплата",
      "Звіт по {entity} податках",
    ],
    descriptionPatterns: [
      "Генерує щоденний фінансовий звіт по {metric}.",
      "Автоматично виконує {action} рахунків за розкладом.",
      "Синхронізує {entity} дані з бухгалтерською системою.",
      "Відстежує {metric} витрат та сповіщує при перевищенні.",
      "Розраховує {metric} прибутку за визначений період.",
      "Автоматично генерує {document} фінансові документи.",
      "Контролює {entity} бюджет та надсилає алерти.",
      "Аналізує {metric} грошових потоків компанії.",
      "Виконує автоматичну {action} оплату постачальникам.",
      "Формує звіт по {entity} податковим зобовʼязанням.",
    ],
    tagPool: ["фінанси", "звіти", "рахунки", "бюджет", "витрати", "прибуток", "податки", "бухгалтерія", "оплата", "аналітика"],
    credentialPool: ["stripe", "google_sheets", "gmail", "slack", "postgresql"],
  },
  // 8. HR
  {
    name: "HR",
    namePatterns: [
      "Онбординг {role} співробітника",
      "Автоматизація {process} відпусток",
      "Збір {type} фідбеку",
      "Нагадування про {event}",
      "Генерація {document} для HR",
      "Відстеження {metric} команди",
      "Розсилка {type} опитувань",
      "Синхронізація {entity} кадрів",
      "Автоматичне {action} завдань",
      "Звіт по {metric} персоналу",
    ],
    descriptionPatterns: [
      "Автоматизує процес онбордингу нового {role} співробітника.",
      "Керує {process} відпустками та лікарняними автоматично.",
      "Збирає {type} фідбек від команди за розкладом.",
      "Надсилає нагадування про {event} в календарі HR.",
      "Генерує {document} HR-документи автоматично.",
      "Відстежує {metric} продуктивності команди.",
      "Розсилає {type} опитування співробітникам.",
      "Синхронізує {entity} кадрові дані між системами.",
      "Автоматично створює {action} завдання для HR-процесів.",
      "Формує звіт по {metric} персоналу за період.",
    ],
    tagPool: ["HR", "онбординг", "відпустки", "фідбек", "команда", "кадри", "опитування", "персонал", "продуктивність", "документи"],
    credentialPool: ["slack", "gmail", "google_sheets", "notion", "asana"],
  },
  // 9. Support
  {
    name: "Підтримка клієнтів",
    namePatterns: [
      "Автовідповідь на {type} звернення",
      "Маршрутизація {type} тікетів",
      "Ескалація {priority} запитів",
      "Збір {metric} задоволеності",
      "Автоматичне {action} тікетів",
      "База знань {action}",
      "Сповіщення про {event} SLA",
      "Класифікація {type} звернень",
      "Шаблони відповідей для {topic}",
      "Звіт по {metric} підтримки",
    ],
    descriptionPatterns: [
      "Автоматично відповідає на {type} звернення клієнтів.",
      "Маршрутизує {type} тікети до відповідного відділу.",
      "Ескалює {priority} запити до старших спеціалістів.",
      "Збирає {metric} задоволеності клієнтів після звернення.",
      "Автоматично виконує {action} тікетів за правилами.",
      "Оновлює базу знань {action} на основі частих питань.",
      "Надсилає сповіщення при {event} порушенні SLA.",
      "Класифікує {type} звернення за допомогою AI.",
      "Підставляє шаблони відповідей для теми {topic}.",
      "Генерує звіт по {metric} роботи підтримки.",
    ],
    tagPool: ["підтримка", "тікети", "клієнти", "SLA", "ескалація", "база знань", "автовідповідь", "задоволеність", "класифікація", "звернення"],
    credentialPool: ["openai", "gmail", "slack", "jira", "telegram"],
  },
  // 10. Content
  {
    name: "Контент",
    namePatterns: [
      "Генерація {type} контенту",
      "Переклад {type} матеріалів",
      "Рерайт {type} текстів",
      "Створення {type} зображень",
      "Публікація {type} статей",
      "Оптимізація {type} контенту",
      "Курація {type} новин",
      "Генерація {type} описів",
      "Планування {type} публікацій",
      "Аналіз {metric} контенту",
    ],
    descriptionPatterns: [
      "Генерує {type} контент за допомогою AI автоматично.",
      "Перекладає {type} матеріали на обрані мови.",
      "Виконує рерайт {type} текстів для унікальності.",
      "Створює {type} зображення за описом через AI.",
      "Публікує {type} статті на платформу за розкладом.",
      "Оптимізує {type} контент для пошукових систем.",
      "Збирає та курує {type} новини з обраних джерел.",
      "Генерує {type} описи товарів або послуг автоматично.",
      "Планує {type} публікації на тиждень або місяць.",
      "Аналізує {metric} контенту та надає рекомендації.",
    ],
    tagPool: ["контент", "генерація", "AI", "переклад", "рерайт", "зображення", "публікація", "оптимізація", "курація", "планування"],
    credentialPool: ["openai", "notion", "google_sheets", "aws_s3", "dropbox"],
  },
  // 11. SEO
  {
    name: "SEO",
    namePatterns: [
      "Аудит {type} сторінок",
      "Моніторинг {metric} позицій",
      "Аналіз {type} ключових слів",
      "Перевірка {type} посилань",
      "Оптимізація {element} сторінок",
      "Генерація {type} мета-тегів",
      "Відстеження {metric} конкурентів",
      "Аналіз {type} контенту",
      "Звіт по {metric} SEO",
      "Автоматичне {action} sitemap",
    ],
    descriptionPatterns: [
      "Проводить автоматичний аудит {type} сторінок сайту.",
      "Моніторить {metric} позицій у пошуковій видачі.",
      "Аналізує {type} ключові слова та визначає можливості.",
      "Перевіряє {type} посилання на сайті та виявляє проблеми.",
      "Оптимізує {element} сторінок для покращення SEO.",
      "Генерує {type} мета-теги для сторінок автоматично.",
      "Відстежує {metric} позиції конкурентів у видачі.",
      "Аналізує {type} контент на відповідність SEO-вимогам.",
      "Формує детальний звіт по {metric} SEO-метрикам.",
      "Автоматично оновлює {action} sitemap сайту.",
    ],
    tagPool: ["SEO", "аудит", "позиції", "ключові слова", "посилання", "мета-теги", "конкуренти", "оптимізація", "видача", "контент"],
    credentialPool: ["google_analytics", "google_sheets", "openai", "slack", "airtable"],
  },
  // 12. Ads
  {
    name: "Реклама",
    namePatterns: [
      "Оптимізація {type} кампаній",
      "Автоматичне {action} бюджету",
      "Аналіз {metric} реклами",
      "Генерація {type} оголошень",
      "A/B тест {element} реклами",
      "Відстеження {metric} ROI",
      "Аудит {type} кампаній",
      "Ретаргетинг {audience}",
      "Звіт по {metric} рекламі",
      "Автоматичне {action} ставок",
    ],
    descriptionPatterns: [
      "Оптимізує {type} рекламні кампанії автоматично.",
      "Автоматично коригує {action} бюджет реклами.",
      "Аналізує {metric} ефективності рекламних кампаній.",
      "Генерує {type} рекламні оголошення за допомогою AI.",
      "Проводить A/B тест {element} у рекламних кампаніях.",
      "Відстежує {metric} ROI рекламних витрат.",
      "Проводить аудит {type} рекламних кампаній.",
      "Налаштовує ретаргетинг для {audience} аудиторії.",
      "Формує звіт по {metric} рекламних кампаній.",
      "Автоматично коригує {action} ставки за правилами.",
    ],
    tagPool: ["реклама", "кампанії", "бюджет", "ROI", "оголошення", "ретаргетинг", "ставки", "конверсії", "оптимізація", "A/B тест"],
    credentialPool: ["facebook", "google_analytics", "google_sheets", "openai", "slack"],
  },
  // 13. Notifications
  {
    name: "Сповіщення",
    namePatterns: [
      "Сповіщення в {channel} про {event}",
      "Алерт при {condition}",
      "Дайджест {type} подій",
      "Ескалація {type} алертів",
      "Push-сповіщення про {event}",
      "SMS-алерт при {condition}",
      "Нагадування про {event}",
      "Сповіщення команді про {event}",
      "Автоматичний {type} дайджест",
      "Маршрутизація {type} сповіщень",
    ],
    descriptionPatterns: [
      "Надсилає сповіщення в {channel} при настанні {event}.",
      "Генерує алерт при виконанні {condition} умови.",
      "Формує дайджест {type} подій за визначений період.",
      "Ескалює {type} алерти при відсутності реакції.",
      "Надсилає push-сповіщення про {event} на мобільний.",
      "Відправляє SMS-алерт при {condition} ситуації.",
      "Нагадує про заплановану {event} подію.",
      "Сповіщує команду про {event} через обраний канал.",
      "Автоматично формує {type} дайджест за розкладом.",
      "Маршрутизує {type} сповіщення до потрібного каналу.",
    ],
    tagPool: ["сповіщення", "алерти", "дайджест", "push", "SMS", "нагадування", "ескалація", "канали", "маршрутизація", "автоматизація"],
    credentialPool: ["slack", "telegram", "twilio", "gmail", "sendgrid"],
  },
  // 14. Data Sync
  {
    name: "Синхронізація даних",
    namePatterns: [
      "Синхронізація {source} -> {target}",
      "Імпорт {entity} з {source}",
      "Експорт {entity} в {target}",
      "Двостороння синхронізація {entity}",
      "Міграція {entity} з {source}",
      "Реплікація {entity} між {env}",
      "ETL {entity} з {source}",
      "Маппінг {entity} між системами",
      "Валідація {entity} при синхронізації",
      "Логування {action} синхронізації",
    ],
    descriptionPatterns: [
      "Синхронізує дані з {source} в {target} автоматично.",
      "Імпортує {entity} з {source} з маппінгом полів.",
      "Експортує {entity} в {target} за розкладом.",
      "Підтримує двосторонню синхронізацію {entity} між системами.",
      "Мігрує {entity} з {source} зі збереженням звʼязків.",
      "Реплікує {entity} між {env} середовищами.",
      "Виконує ETL-процес для {entity} з {source}.",
      "Виконує маппінг {entity} між різними системами.",
      "Валідує {entity} дані під час синхронізації.",
      "Логує всі {action} операції синхронізації.",
    ],
    tagPool: ["синхронізація", "імпорт", "експорт", "ETL", "міграція", "реплікація", "маппінг", "валідація", "дані", "інтеграція"],
    credentialPool: ["google_sheets", "airtable", "postgresql", "mysql", "mongodb", "firebase"],
  },
  // 15. Reports
  {
    name: "Звіти",
    namePatterns: [
      "Щоденний звіт {metric}",
      "Щотижневий звіт {metric}",
      "Щомісячний звіт {metric}",
      "Зведений звіт {entity}",
      "Порівняльний звіт {metric}",
      "Автоматичний {type} звіт",
      "Звіт для {audience}",
      "Дашборд {metric}",
      "Експорт звіту {metric}",
      "Генерація PDF звіту {metric}",
    ],
    descriptionPatterns: [
      "Генерує щоденний звіт по {metric} та надсилає команді.",
      "Формує щотижневий звіт {metric} з графіками.",
      "Створює щомісячний звіт {metric} для керівництва.",
      "Обʼєднує дані та створює зведений звіт {entity}.",
      "Порівнює {metric} за різні періоди в звіті.",
      "Автоматично генерує {type} звіт за розкладом.",
      "Формує звіт спеціально для {audience}.",
      "Створює дашборд з ключовими {metric}.",
      "Експортує звіт {metric} в обраний формат.",
      "Генерує PDF-документ зі звітом {metric}.",
    ],
    tagPool: ["звіти", "аналітика", "дашборд", "метрики", "PDF", "експорт", "автоматизація", "графіки", "зведення", "генерація"],
    credentialPool: ["google_sheets", "google_analytics", "slack", "gmail", "openai"],
  },
  // 16. Scheduling
  {
    name: "Планування",
    namePatterns: [
      "Планування {type} зустрічей",
      "Автоматичний розклад {entity}",
      "Нагадування про {event}",
      "Синхронізація {type} календарів",
      "Бронювання {entity}",
      "Розклад {type} публікацій",
      "Планування {type} задач",
      "Автоматичне {action} подій",
      "Розподіл {entity} по часу",
      "Оптимізація {type} розкладу",
    ],
    descriptionPatterns: [
      "Автоматично планує {type} зустрічі за доступністю.",
      "Створює автоматичний розклад {entity} на тиждень.",
      "Надсилає нагадування про заплановані {event}.",
      "Синхронізує {type} календарі між платформами.",
      "Автоматизує бронювання {entity} за правилами.",
      "Створює розклад {type} публікацій на місяць.",
      "Планує {type} задачі та розподіляє між командою.",
      "Автоматично створює {action} події в календарі.",
      "Оптимально розподіляє {entity} по часовим слотам.",
      "Оптимізує {type} розклад для максимальної ефективності.",
    ],
    tagPool: ["планування", "розклад", "календар", "зустрічі", "бронювання", "нагадування", "задачі", "публікації", "оптимізація", "автоматизація"],
    credentialPool: ["google_sheets", "slack", "gmail", "notion", "asana"],
  },
  // 17. Lead Gen
  {
    name: "Лідогенерація",
    namePatterns: [
      "Збір лідів з {source}",
      "Кваліфікація {type} лідів",
      "Скорінг {type} лідів",
      "Автоматична {action} лідів",
      "Нурчеринг {type} лідів",
      "Збагачення даних {entity}",
      "Воронка {type} лідів",
      "Ретаргетинг {type} лідів",
      "Сегментація {type} лідів",
      "Конверсія {type} лідів",
    ],
    descriptionPatterns: [
      "Збирає ліди з {source} та додає в CRM автоматично.",
      "Кваліфікує {type} ліди за визначеними критеріями.",
      "Присвоює скор {type} лідам на основі поведінки.",
      "Автоматично виконує {action} для нових лідів.",
      "Проводить нурчеринг {type} лідів через серію листів.",
      "Збагачує дані {entity} з зовнішніх джерел.",
      "Керує воронкою {type} лідів автоматично.",
      "Налаштовує ретаргетинг для {type} лідів.",
      "Сегментує {type} ліди за різними критеріями.",
      "Відстежує конверсію {type} лідів у клієнтів.",
    ],
    tagPool: ["лідогенерація", "ліди", "кваліфікація", "скорінг", "нурчеринг", "воронка", "конверсія", "збагачення", "сегментація", "автоматизація"],
    credentialPool: ["hubspot", "salesforce", "gmail", "mailchimp", "facebook", "google_sheets"],
  },
  // 18. Monitoring
  {
    name: "Моніторинг",
    namePatterns: [
      "Моніторинг {metric} сайту",
      "Перевірка {type} доступності",
      "Відстеження {metric} API",
      "Алерт при {condition} помилці",
      "Моніторинг {metric} бази даних",
      "Перевірка {type} сертифікатів",
      "Відстеження {metric} продуктивності",
      "Моніторинг {type} логів",
      "Перевірка {entity} безпеки",
      "Моніторинг {metric} черг",
    ],
    descriptionPatterns: [
      "Моніторить {metric} сайту та сповіщує при проблемах.",
      "Перевіряє {type} доступність сервісів за розкладом.",
      "Відстежує {metric} API-ендпоінтів та час відповіді.",
      "Генерує алерт при {condition} критичній помилці.",
      "Моніторить {metric} бази даних та оптимізацію.",
      "Перевіряє термін дії {type} SSL-сертифікатів.",
      "Відстежує {metric} продуктивності системи.",
      "Аналізує {type} логи та виявляє паттерни.",
      "Перевіряє {entity} безпеку та вразливості.",
      "Моніторить {metric} черг повідомлень.",
    ],
    tagPool: ["моніторинг", "алерти", "доступність", "продуктивність", "логи", "безпека", "сертифікати", "API", "бази даних", "черги"],
    credentialPool: ["slack", "telegram", "aws_s3", "postgresql", "redis", "github"],
  },
  // 19. Backup
  {
    name: "Бекап",
    namePatterns: [
      "Бекап {entity} бази даних",
      "Архівація {entity} файлів",
      "Резервне копіювання {entity}",
      "Автоматичний бекап {entity}",
      "Інкрементальний бекап {entity}",
      "Бекап {entity} в хмару",
      "Відновлення {entity} з бекапу",
      "Ротація {type} бекапів",
      "Верифікація {type} бекапів",
      "Бекап {entity} конфігурацій",
    ],
    descriptionPatterns: [
      "Створює регулярний бекап {entity} бази даних.",
      "Архівує {entity} файли та завантажує в хмарне сховище.",
      "Виконує резервне копіювання {entity} за розкладом.",
      "Автоматично створює бекап {entity} щодня.",
      "Виконує інкрементальний бекап {entity} для економії місця.",
      "Завантажує бекап {entity} в хмарне сховище.",
      "Автоматизує відновлення {entity} з резервної копії.",
      "Ротує {type} бекапи згідно з політикою зберігання.",
      "Верифікує цілісність {type} резервних копій.",
      "Створює бекап {entity} конфігураційних файлів.",
    ],
    tagPool: ["бекап", "резервне копіювання", "архівація", "відновлення", "хмара", "ротація", "верифікація", "база даних", "файли", "конфігурації"],
    credentialPool: ["aws_s3", "dropbox", "postgresql", "mysql", "mongodb", "firebase"],
  },
  // 20. Integrations
  {
    name: "Інтеграції",
    namePatterns: [
      "Інтеграція {source} з {target}",
      "Звʼязок {source} та {target}",
      "Конектор {source} -> {target}",
      "Автосинхронізація {source} і {target}",
      "Міст {source} - {target}",
      "Двостороння інтеграція {source}",
      "Webhook {source} -> {target}",
      "API інтеграція {source}",
      "Потік даних {source} -> {target}",
      "Зʼєднання {source} з {target}",
    ],
    descriptionPatterns: [
      "Інтегрує {source} з {target} для автоматичного обміну даними.",
      "Створює звʼязок між {source} та {target} для синхронізації.",
      "Конектор для передачі даних з {source} в {target}.",
      "Автоматично синхронізує дані між {source} і {target}.",
      "Створює міст для обміну даними між {source} і {target}.",
      "Реалізує двосторонню інтеграцію з {source}.",
      "Приймає webhook з {source} та передає дані в {target}.",
      "Інтегрує API {source} з внутрішніми системами.",
      "Організує потік даних з {source} в {target}.",
      "Зʼєднує {source} з {target} для обміну подіями.",
    ],
    tagPool: ["інтеграція", "API", "webhook", "синхронізація", "конектор", "потік даних", "обмін", "автоматизація", "зʼєднання", "міст"],
    credentialPool: ["slack", "gmail", "notion", "trello", "asana", "jira", "github", "airtable", "zapier", "hubspot"],
  },
];

// ---------------------------------------------------------------------------
// Substitution pools per placeholder
// ---------------------------------------------------------------------------

const substitutions: Record<string, string[]> = {
  platform: ["Instagram", "Facebook", "Twitter", "Telegram", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Reddit", "Discord"],
  platform2: ["Facebook", "Telegram", "Twitter", "LinkedIn", "Instagram", "TikTok", "YouTube", "Pinterest", "Discord", "Reddit"],
  metric: ["залученості", "конверсій", "продажів", "трафіку", "відвідувань", "CTR", "ROI", "охоплення", "кліків", "доходу"],
  type: ["промо", "інформаційних", "транзакційних", "персоналізованих", "тригерних", "масових", "сегментованих", "тестових", "вітальних", "сервісних"],
  trigger_desc: ["підписку", "реєстрацію", "покупку", "запит", "скаргу", "відгук", "питання", "звернення", "замовлення", "бронювання"],
  segment: ["активних", "нових", "VIP", "неактивних", "лояльних", "потенційних", "цільових", "преміум", "базових", "пробних"],
  element: ["заголовків", "CTA кнопок", "зображень", "тексту", "макетів", "кольорів", "шрифтів", "форм", "банерів", "відео"],
  audience: ["нових клієнтів", "підписників", "користувачів", "покупців", "відвідувачів", "лідів", "партнерів", "менеджерів", "стейкхолдерів", "інвесторів"],
  event: ["нове замовлення", "нову реєстрацію", "оплату", "помилку", "зміну статусу", "дедлайн", "завершення", "початок", "скасування", "оновлення"],
  source: ["Google Sheets", "HubSpot", "Salesforce", "Notion", "Airtable", "MySQL", "PostgreSQL", "MongoDB", "Firebase", "API"],
  target: ["Slack", "CRM", "Google Sheets", "Notion", "Email", "Telegram", "Database", "Airtable", "Trello", "Asana"],
  entity: ["контактів", "угод", "лідів", "задач", "замовлень", "товарів", "клієнтів", "проєктів", "записів", "документів"],
  action: ["створення", "оновлення", "видалення", "закриття", "архівація", "перевірка", "підтвердження", "відхилення", "перенесення", "копіювання"],
  stage: ["першого контакту", "кваліфікації", "пропозиції", "переговорів", "закриття", "онбордингу", "підтримки", "ретеншну", "апсейлу", "рефералу"],
  document: ["PDF", "Excel", "CSV", "рахунків", "актів", "договорів", "інвойсів", "звітів", "довідок", "сертифікатів"],
  process: ["подання", "погодження", "відхилення", "розрахунку", "нарахування", "обліку", "планування", "контролю", "затвердження", "перегляду"],
  role: ["розробника", "менеджера", "дизайнера", "аналітика", "маркетолога", "HR", "підтримки", "продажів", "фінансів", "операцій"],
  priority: ["критичних", "високих", "середніх", "низьких", "термінових", "блокуючих", "звичайних", "планових", "ескальованих", "повторних"],
  topic: ["технічних питань", "оплати", "доставки", "повернень", "акаунту", "безпеки", "налаштувань", "інтеграцій", "API", "білінгу"],
  service: ["API", "мікросервіс", "фронтенд", "бекенд", "бази даних", "кеш", "черги", "CDN", "auth-сервіс", "gateway"],
  env: ["staging", "production", "development", "testing", "preview", "QA", "pre-prod", "demo", "sandbox", "canary"],
  check: ["SSL", "OWASP", "вразливостей", "конфігурації", "доступу", "паролів", "фаєрволу", "портів", "залежностей", "токенів"],
  condition: ["500", "timeout", "OOM", "високому CPU", "диску", "памʼяті", "латенсі", "помилці БД", "мережі", "API"],
  channel: ["Slack", "Telegram", "Email", "SMS", "Discord", "Teams", "Webhook", "Push", "Viber", "WhatsApp"],
  payment: ["Stripe", "LiqPay", "Fondy", "PayPal", "Mono", "Privat", "WayForPay", "Portmone", "Apple Pay", "Google Pay"],
};

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

function applyPattern(pattern: string, variantIdx: number): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key: string) => {
    const pool = substitutions[key];
    if (!pool) return key;
    return pool[variantIdx % pool.length];
  });
}

function generate(): WorkflowTemplate[] {
  const templates: WorkflowTemplate[] = [];

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx];

    for (let v = 0; v < 100; v++) {
      const patternIdx = v % cat.namePatterns.length;
      // Use different substitution index for variety within same pattern
      const subIdx = Math.floor(v / cat.namePatterns.length) + v;

      const name = applyPattern(cat.namePatterns[patternIdx], subIdx);
      const descPattern = cat.descriptionPatterns[patternIdx];
      const description = applyPattern(descPattern, subIdx);

      const tagCount = 2 + (v % 3); // 2-4 tags
      const tags = pickN(cat.tagPool, v, tagCount);

      const credCount = 1 + (v % 3) + 1; // 2-4 credentials
      const creds = pickN(cat.credentialPool, v, credCount);

      const nodeCount = 2 + (v % 4); // 2-5 nodes
      const nodes = generateNodes(v, creds, nodeCount);

      const trigger = triggerForIndex(v);

      templates.push({
        id: makeId(catIdx, v),
        name,
        description,
        category: cat.name,
        tags,
        trigger,
        required_credentials: creds,
        nodes,
      });
    }
  }

  return templates;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const templates = generate();

const outDir = join(__dirname, "..", "workflows");
mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, "templates.json");
writeFileSync(outPath, JSON.stringify(templates, null, 2), "utf-8");

console.log(`Generated ${templates.length} templates -> ${outPath}`);
