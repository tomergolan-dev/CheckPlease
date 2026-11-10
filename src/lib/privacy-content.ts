import type { AppLocale } from '@/i18n/routing'

/** Where people ask for their account and data to be deleted. Shown publicly on the privacy page. */
export const PRIVACY_CONTACT_EMAIL = 'tomergolan01@gmail.com'

/** Bump whenever the content below changes in substance. */
export const PRIVACY_LAST_UPDATED = new Date('2026-11-10T00:00:00Z')

export interface PrivacySection {
  title: string
  /** Each entry is one short paragraph, or a bullet when the section sets `bullets`. */
  body: string[]
  bullets?: boolean
}

export interface PrivacyContent {
  title: string
  lastUpdated: string
  intro: string
  sections: PrivacySection[]
  contactTitle: string
  contactBody: string
  backAction: string
}

/**
 * Plain-language privacy policy. Written to match what the app actually does (see CLAUDE.md:
 * local-first bills, accounts, credits, Stripe, bill photos); update it whenever any of that
 * changes. Hebrew is canonical, not a translation.
 */
export const PRIVACY_CONTENT: Record<AppLocale, PrivacyContent> = {
  he: {
    title: 'פרטיות',
    lastUpdated: 'עודכן לאחרונה',
    intro:
      'Check Please עוזרת לפצל חשבון במסעדה. אפשר להשתמש בה בלי חשבון בכלל, ואז שום דבר לא יוצא מהמכשיר. כאן מוסבר בפשטות מה נשמר, איפה, ולמה.',
    sections: [
      {
        title: 'בלי חשבון',
        body: [
          'החשבון שאתם מפצלים (סועדים, מנות, טיפ) נשמר רק בדפדפן שלכם, כדי שלא יאבד אם סוגרים את האפליקציה.',
          'נשמרת גם עוגייה קטנה שזוכרת את השפה שבחרתם.',
        ],
      },
      {
        title: 'כשמתחברים',
        bullets: true,
        body: [
          'המייל והשם שלכם, ותמונת הפרופיל אם התחברתם עם Google.',
          'סיסמה, אם נרשמתם עם מייל. היא נשמרת מוצפנת, ואף אחד לא יכול לקרוא אותה.',
          'החשבון שאתם עובדים עליו, כדי שתוכלו להמשיך ממכשיר אחר, וחשבונות ששמרתם ב"החשבונות שלי".',
          'יתרת הקרדיטים, היסטוריית הרכישות, ורישום של כל סריקה: מתי היא קרתה והאם הצליחה. זה כדי לחייב נכון ולמנוע שימוש לרעה.',
        ],
      },
      {
        title: 'סריקת חשבון',
        bullets: true,
        body: [
          'כשסורקים חשבון, התמונה נשלחת ל-Claude של Anthropic, שמזהה את המנות והמחירים. לפי התנאים של Anthropic, מידע שנשלח כך לא משמש לאימון המודלים שלהם.',
          'אם הוספתם מנות מהסריקה, התמונה נשמרת באחסון פרטי כדי שתוכלו לחזור אליה. רק אתם יכולים לראות אותה.',
          'תמונה שצילמתם מחדש, או של חשבון שמחקתם, נמחקת מיד. תמונה שלא נכנסה לשום חשבון נמחקת אחרי יום.',
          'בתמונת חשבון יכולים להופיע שם המסעדה, שם המלצר או ספרות של כרטיס אשראי. כדאי לצלם רק את רשימת המנות.',
        ],
      },
      {
        title: 'תשלומים',
        body: [
          'רכישת קרדיטים נעשית דרך Stripe. פרטי הכרטיס נמסרים ישירות ל-Stripe, ואנחנו לא רואים ולא שומרים אותם. אצלנו נשמר רק מה נקנה, מתי ובכמה.',
          'כרגע האפליקציה בגרסת הדגמה, ולא מתבצע חיוב אמיתי.',
        ],
      },
      {
        title: 'עם מי המידע משותף',
        body: [
          'רק עם השירותים שמפעילים את האפליקציה: Vercel (אירוח ואחסון התמונות), Neon (מסד הנתונים), Anthropic (סריקה), Stripe (תשלומים), ו-Google אם התחברתם דרכה.',
          'אנחנו לא מוכרים מידע, לא מציגים פרסומות, ולא משתמשים בכלי מעקב או סטטיסטיקה.',
        ],
      },
      {
        title: 'מחיקה',
        body: [
          'התנתקות לא מוחקת כלום. החשבון שעל המכשיר נשאר, והמידע שלכם מחכה לכם כשתתחברו שוב.',
          'כדי למחוק את החשבון ואת כל המידע שלכם, כולל התמונות, שלחו לנו מייל מהכתובת שאיתה נרשמתם. המחיקה תתבצע תוך 30 יום.',
        ],
      },
    ],
    contactTitle: 'שאלות?',
    contactBody: 'אפשר לכתוב לנו בכל נושא שקשור לפרטיות:',
    backAction: 'חזרה לאפליקציה',
  },
  en: {
    title: 'Privacy',
    lastUpdated: 'Last updated',
    intro:
      "Check Please helps you split a restaurant bill. You can use it without an account, and then nothing leaves your device. Here's what's saved, where, and why, in plain words.",
    sections: [
      {
        title: 'Without an account',
        body: [
          "The bill you're splitting (diners, dishes, tip) is saved only in your browser, so it isn't lost if you close the app.",
          'A small cookie also remembers the language you chose.',
        ],
      },
      {
        title: 'When you sign in',
        bullets: true,
        body: [
          'Your email and name, and your profile picture if you signed in with Google.',
          "Your password, if you signed up with email. It's stored encrypted, and no one can read it.",
          "The bill you're working on, so you can pick it up on another device, and bills you saved to My Bills.",
          'Your credit balance, purchase history, and a record of each scan: when it happened and whether it worked. This keeps charges correct and prevents abuse.',
        ],
      },
      {
        title: 'Scanning a bill',
        bullets: true,
        body: [
          "When you scan a bill, the photo is sent to Anthropic's Claude, which reads the dishes and prices. Under Anthropic's terms, data sent this way isn't used to train their models.",
          'If you added dishes from a scan, the photo is kept in private storage so you can look back at it. Only you can see it.',
          "A photo you retook, or one from a bill you deleted, is deleted right away. A photo that didn't end up in any bill is deleted after a day.",
          "A bill photo can show the restaurant's name, a waiter's name or digits of a card. It's best to photograph just the list of dishes.",
        ],
      },
      {
        title: 'Payments',
        body: [
          "Credits are bought through Stripe. Your card details go straight to Stripe; we never see or store them. We keep only what was bought, when, and for how much.",
          "The app is currently a demo, and nothing is actually charged.",
        ],
      },
      {
        title: 'Who we share data with',
        body: [
          'Only the services that run the app: Vercel (hosting and photo storage), Neon (database), Anthropic (scanning), Stripe (payments), and Google if you signed in with it.',
          "We don't sell data, show ads, or use tracking or analytics tools.",
        ],
      },
      {
        title: 'Deleting your data',
        body: [
          'Signing out deletes nothing. The bill on your device stays, and your data is waiting when you sign back in.',
          'To delete your account and all your data, photos included, email us from the address you signed up with. It will be deleted within 30 days.',
        ],
      },
    ],
    contactTitle: 'Questions?',
    contactBody: 'Write to us about anything privacy-related:',
    backAction: 'Back to the app',
  },
}
