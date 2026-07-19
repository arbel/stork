import { useSwipe } from "@/contexts/SwipeContext";
import { NameListLayout } from "@/components/NameListLayout";

const Passed = () => {
  const { passedNames } = useSwipe();

  return (
    <NameListLayout
      title="דילגתי"
      variant="passed"
      names={passedNames}
      bannerText="שמות שדילגתם עליהם"
      emptyTitle="לא דילגתם על שמות!"
      emptyText="עדיין לא דילגתם על אף שם."
      ctaText="התחילו להחליק"
    />
  );
};

export default Passed;
