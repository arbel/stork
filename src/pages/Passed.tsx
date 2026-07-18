import { useState } from "react";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenderDistributionBar } from "@/components/GenderDistributionBar";

const NameCard = ({ name }: { name: BabyName }) => {
  return (
    <Card className="p-4 transition-all hover:scale-105 border border-[#EF5185]/40 bg-gradient-to-br from-[#EF5185]/10 to-[#EF5185]/5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground">{name.displayName || name.name}</h3>
        <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm">
          <X className="w-5 h-5 text-[#EF5185]" />
        </div>
      </div>
      {(name.maleOccurrences !== undefined || name.femaleOccurrences !== undefined) && (
        <div className="mb-2">
          <GenderDistributionBar 
            maleOccurrences={name.maleOccurrences || 0} 
            femaleOccurrences={name.femaleOccurrences || 0} 
          />
        </div>
      )}
      {name.meaning && (
        <p className="text-sm text-foreground leading-relaxed">"{name.meaning}"</p>
      )}
    </Card>
  );
};

const Passed = () => {
  const { passedNames } = useSwipe();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNames = passedNames.filter(name => 
    name.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (name.displayName && name.displayName.includes(searchQuery))
  );

  return (
    <div 
      className="h-screen overflow-y-auto smooth-scroll pb-8"
      style={{
        backgroundImage: 'url(/bg-base.png)',
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
            דילגתי
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        {passedNames.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-3 space-x-reverse bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
                <X className="w-6 h-6 text-[#EF5185]" />
                <span className="text-[#EF5185] font-bold text-lg">שמות שדילגתם עליהם</span>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="חיפוש שמות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white/90 backdrop-blur-md border-0 rounded-full"
              />
            </div>

            {filteredNames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNames.map((name, index) => (
                  <NameCard key={`passed-${index}`} name={name} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/80">אין שמות שתואמים את החיפוש.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
              <X className="w-12 h-12 text-[#EF5185]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">לא דילגתם על שמות!</h3>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">עדיין לא דילגתם על אף שם.</p>
            <Button onClick={() => navigate("/")} className="bg-[#EF5185] hover:bg-[#D9406E] text-white">
              התחילו להחליק
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Passed;