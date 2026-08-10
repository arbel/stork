import { Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Public confirmation page the unsubscribe email link redirects to (the edge function flips
// the preference, then sends the user here). No auth required.
const Unsubscribed = () => {
  const [params] = useSearchParams();
  const status = params.get("status");
  const name = params.get("name");

  const ok = status === "ok";
  const title = ok ? "ביטלנו את העדכונים ✔️" : "קישור לא תקין";
  const message = ok
    ? `${name ? name + ", " : ""}לא נשלח לכם יותר את סיכום השבוע. אפשר להפעיל שוב בכל רגע מדף ההגדרות. נשמח לראותכם ממשיכים לבחור שם ביחד 💛`
    : "הקישור לביטול חסר או שגוי. אפשר לנהל עדכונים ישירות מדף ההגדרות באפליקציה.";

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-secondary/40 to-background">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-3">🕊️</div>
        <h1 className="text-2xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <Link to="/settings">
            <Button className="w-full">לניהול העדכונים בהגדרות</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full">חזרה לסטורק</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Unsubscribed;
