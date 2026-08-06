import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const LAST_UPDATED = "6 באוגוסט 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
    <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div
      className="h-screen overflow-y-auto smooth-scroll pb-8"
      style={{
        backgroundImage: 'url(/bg-base.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-14 w-14 text-white hover:bg-white/10"
          >
            <ArrowRight className="w-10 h-10" />
          </Button>

          <h1 className="text-xl font-bold text-white truncate flex-1 text-center mx-4">
            מדיניות פרטיות
          </h1>

          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <Card className="p-6 bg-white/95 backdrop-blur-md space-y-6">
          <p className="text-xs text-muted-foreground">עודכן לאחרונה: {LAST_UPDATED}</p>

          <Section title="כללי">
            <p>
              Stork (״האפליקציה״) היא אפליקציה המסייעת לזוגות לבחור יחד שם לתינוק.
              מדיניות זו מסבירה איזה מידע אנחנו אוספים, למה אנחנו משתמשים בו, עם מי הוא
              משותף ואילו זכויות יש לכם. השימוש באפליקציה מהווה הסכמה למדיניות זו.
            </p>
          </Section>

          <Section title="איזה מידע אנחנו אוספים">
            <ul className="list-disc pr-5 space-y-1">
              <li>
                <strong>פרטי חשבון</strong> — כתובת אימייל (משמשת להתחברות באמצעות קוד
                חד־פעמי) ושם פרטי, אם בחרתם למסור אותו.
              </li>
              <li>
                <strong>בחירות והעדפות</strong> — שמות שאהבתם או דילגתם עליהם, התאמות עם
                בן/בת הזוג והעדפות סינון (למשל מגדר ומקור השם).
              </li>
              <li>
                <strong>קשר זוגי</strong> — חיבור בין החשבון שלכם לחשבון של בן/בת הזוג
                שהזמנתם או שהצטרפתם אליהם.
              </li>
              <li>
                <strong>משוב</strong> — תוכן הפניות שאתם שולחים דרך טופס המשוב, יחד עם
                כתובת האימייל והשם שלכם.
              </li>
              <li>
                <strong>נתוני שימוש</strong> — מידע סטטיסטי ואנונימי ברובו על השימוש באתר
                (עמודים שנצפו, סוג דפדפן ומכשיר), הנאסף באמצעות Google Analytics.
              </li>
            </ul>
          </Section>

          <Section title="למה אנחנו משתמשים במידע">
            <p>
              המידע משמש אך ורק להפעלת האפליקציה: התחברות לחשבון, שמירת הבחירות שלכם,
              הצגת התאמות משותפות לכם ולבן/בת הזוג, מענה לפניות ושיפור השירות. אנחנו לא
              מוכרים את המידע שלכם ולא משתמשים בו לפרסום.
            </p>
          </Section>

          <Section title="שיתוף מידע">
            <ul className="list-disc pr-5 space-y-1">
              <li>
                <strong>עם בן/בת הזוג</strong> — לאחר חיבור החשבונות, בן/בת הזוג רואים את
                השם הפרטי וכתובת האימייל שלכם, ואת ההתאמות המשותפות (שמות ששניכם אהבתם).
                שמות שאהבתם או דילגתם עליהם ללא התאמה אינם נחשפים.
              </li>
              <li>
                <strong>ספקי שירות</strong> — האפליקציה מאוחסנת ומופעלת באמצעות Vercel
                (אירוח האתר), Supabase (מסד נתונים ואימות) ו־Google Analytics (סטטיסטיקות
                שימוש). ספקים אלה מעבדים את המידע עבורנו בלבד, ושרתיהם עשויים להימצא מחוץ
                לישראל.
              </li>
              <li>
                מעבר לכך, לא נעביר מידע אישי לצד שלישי אלא אם נידרש לכך על פי דין.
              </li>
            </ul>
          </Section>

          <Section title="עוגיות (Cookies) ואחסון מקומי">
            <p>
              האפליקציה שומרת בדפדפן נתוני התחברות (כדי שתישארו מחוברים) ומשתמשת בעוגיות
              של Google Analytics לצורך מדידת שימוש. ניתן לחסום עוגיות בהגדרות הדפדפן;
              הדבר לא יפגע בשימוש בסיסי באפליקציה.
            </p>
          </Section>

          <Section title="אבטחת מידע">
            <p>
              התקשורת עם האפליקציה מוצפנת (HTTPS), וההתחברות מתבצעת באמצעות קוד חד־פעמי
              ללא סיסמה. הגישה למידע במסד הנתונים מוגבלת כך שכל משתמש יכול לגשת רק למידע
              שלו ושל בן/בת הזוג המחוברים אליו. עם זאת, אף מערכת אינה חסינה לחלוטין, ולא
              ניתן להבטיח אבטחה מוחלטת.
            </p>
          </Section>

          <Section title="שמירת מידע ומחיקה">
            <p>
              המידע נשמר כל עוד החשבון שלכם פעיל. תוכלו למחוק בכל עת את הבחירות שלכם דרך
              מסך ההגדרות, וכן לנתק את הקשר הזוגי. למחיקה מלאה של החשבון וכל המידע הקשור
              אליו, פנו אלינו ואנחנו נמחק אותו בתוך זמן סביר.
            </p>
          </Section>

          <Section title="הזכויות שלכם">
            <p>
              בהתאם לחוק הגנת הפרטיות, התשמ״א-1981, אתם זכאים לעיין במידע שנשמר עליכם,
              לבקש לתקן אותו או לבקש את מחיקתו. לצורך כך פנו אלינו באמצעות פרטי הקשר שלהלן.
            </p>
          </Section>

          <Section title="קטינים">
            <p>
              האפליקציה מיועדת להורים ולהורים לעתיד, ואינה מיועדת לשימוש על ידי ילדים
              מתחת לגיל 18.
            </p>
          </Section>

          <Section title="שינויים במדיניות">
            <p>
              ייתכן שנעדכן מדיניות זו מעת לעת. הגרסה העדכנית תפורסם תמיד בעמוד זה, עם
              תאריך העדכון האחרון.
            </p>
          </Section>

          <Section title="יצירת קשר">
            <p>
              לשאלות או בקשות בנושא פרטיות ניתן לפנות דרך טופס המשוב באפליקציה או בכתובת{" "}
              <a href="mailto:info@stork-app.com" className="text-primary underline" dir="ltr">
                info@stork-app.com
              </a>
              .
            </p>
          </Section>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
