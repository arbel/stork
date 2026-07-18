import { useState } from "react";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Heart, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenderDistributionBar } from "@/components/GenderDistributionBar";

const NameCard = ({ name }: { name: BabyName }) => {
  return (
    <Card className="p-4 transition-all hover:scale-105 border border-[#22C55E]/40 bg-gradient-to-br from-[#22C55E]/10 to-[#22C55E]/5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground">{name.displayName || name.name}</h3>
        <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm">
          <Heart className="w-5 h-5 text-[#22C55E] fill-current" />
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

const Liked = () => {
  const { likedNames } = useSwipe();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNames = likedNames.filter(name => 
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
            <ArrowLeft className="w-10 h-10" />
          </Button>
          
          <h1 className="text-xl font-bold text-white truncate flex-1 text-center mx-4">
            Liked
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        {likedNames.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
                <Heart className="w-6 h-6 text-[#22C55E] fill-current" />
                <span className="text-[#22C55E] font-bold text-lg">Your Favorite Names</span>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/90 backdrop-blur-md border-0 rounded-full"
              />
            </div>

            {filteredNames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNames.map((name, index) => (
                  <NameCard key={`liked-${index}`} name={name} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/80">No names match your search.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
              <Heart className="w-12 h-12 text-[#22C55E]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No favorites yet!</h3>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">Swipe right on names you love.</p>
            <Button onClick={() => navigate("/")} className="bg-[#22C55E] hover:bg-[#1CA34D] text-white">
              Start Swiping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Liked;