import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface InvitePartnerPromptProps {
  onClose: () => void;
}

// A gentle one-time nudge shown to solo swipers (no partner joined yet) after they've been
// around a few days. Visual language mirrors MatchCelebration: white rounded card on a dark
// scrim, bouncing decoration overlapping the top, pink primary pill. Trigger/eligibility
// lives in SwipeInterface — this component only renders and routes.
export const InvitePartnerPrompt = ({ onClose }: InvitePartnerPromptProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setVisible(false);
    window.setTimeout(onClose, 250);
  };

  const goToInvite = () => {
    setVisible(false);
    window.setTimeout(() => {
      onClose();
      navigate("/partner/invite");
    }, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-gray-900/80" onClick={close} />

      <div
        dir="rtl"
        className={`relative bg-white rounded-3xl px-6 pt-8 pb-6 mx-4 max-w-sm w-full text-center shadow-2xl transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Bouncing decoration overlapping the top edge */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1 items-end">
          <span className="text-2xl animate-bounce" style={{ animationDelay: "0s" }}>💕</span>
          <span className="text-4xl animate-bounce" style={{ animationDelay: "0.1s" }}>🕊️</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: "0.2s" }}>💕</span>
        </div>

        <h1 className="text-xl font-extrabold mt-3 mb-3" style={{ color: "#C42A63" }}>
          שם מושלם בוחרים ביחד
        </h1>

        <p className="text-[15px] leading-relaxed mb-6" style={{ color: "#5a4850" }}>
          כבר כמה ימים שאתם מחליקים לבד.
          <br />
          הזמינו את <b style={{ color: "#C42A63" }}>בן/בת הזוג</b> — וכל שם ששניכם אוהבים יהפוך
          ל<b style={{ color: "#C42A63" }}>התאמה</b> 🎉
        </p>

        <button
          onClick={goToInvite}
          className="w-full text-white font-extrabold text-[17px] py-4 rounded-full transition-transform hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg,#D6336C,#B92559)",
            boxShadow: "0 12px 26px -12px rgba(185,37,89,.75)",
          }}
        >
          להזמנת בן/בת הזוג ←
        </button>

        <button
          onClick={close}
          className="mt-3 text-[14.5px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          אולי מאוחר יותר
        </button>
      </div>
    </div>
  );
};
