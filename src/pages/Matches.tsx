import { useEffect, useState } from "react";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenderDistributionBar } from "@/components/GenderDistributionBar";

const NameCard = ({ name }: { name: BabyName }) => {
  return (
    <Card className="p-4 transition-all hover:scale-105 border-2 border-[#5CC1B6] bg-gradient-to-br from-[#5CC1B6]/10 to-[#5CC1B6]/5 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground">{name.displayName || name.name}</h3>
        <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm">
          <Sparkles className="w-5 h-5 text-[#5CC1B6]" />
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

const Matches = () => {
  const { matches, partnership } = useSwipe();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dbMatches, setDbMatches] = useState<BabyName[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadMatchesFromDb = async () => {
      if (!user || !partnership) {
        console.log('DB matches: missing user or partnership, falling back to context');
        setDbMatches(null);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        console.log('DB matches: no partner in partnership, falling back to context');
        setDbMatches(null);
        return;
      }

      try {
        console.log('DB matches: loading for partnership', partnership.id);

        const { data: swipes, error } = await supabase
          .from('user_swipes')
          .select('name, user_id, action')
          .eq('partnership_id', partnership.id)
          .in('user_id', [user.id, partnerId])
          .eq('action', 'like');

        if (error) {
          console.error('Error loading matches from DB:', error);
          setDbMatches(null);
          return;
        }

        const userLikes = new Set(
          (swipes || [])
            .filter(s => s.user_id === user.id)
            .map(s => s.name)
        );
        const partnerLikes = new Set(
          (swipes || [])
            .filter(s => s.user_id === partnerId)
            .map(s => s.name)
        );

        const matchNames = Array.from(userLikes).filter(name => partnerLikes.has(name));
        console.log('DB matches: found', matchNames.length, 'names:', matchNames);

        if (matchNames.length === 0) {
          setDbMatches([]);
          return;
        }

        const { data: nameRows, error: namesError } = await supabase
          .from('names')
          .select('*')
          .in('name', matchNames)
          .eq('is_active', true);

        if (namesError) {
          console.error('Error loading name details for matches:', namesError);
          setDbMatches(null);
          return;
        }

        const mapped: BabyName[] = (nameRows || []).map(n => ({
          name: n.name,
          displayName: n.display_name || undefined,
          origin: n.origin || undefined,
          meaning: n.meaning || undefined,
          maleOccurrences: n.male_occurrences || 0,
          femaleOccurrences: n.female_occurrences || 0,
        }));

        // Sort alphabetically by name for stable display
        mapped.sort((a, b) => a.name.localeCompare(b.name));

        setDbMatches(mapped);
      } catch (err) {
        console.error('Unexpected error loading matches from DB:', err);
        setDbMatches(null);
      }
    };

    loadMatchesFromDb();
  }, [user, partnership]);

  const displayMatches = dbMatches ?? matches;

  const filteredMatches = displayMatches.filter(name => 
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
            Matches
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        {displayMatches.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
                <Sparkles className="w-6 h-6 text-[#5CC1B6]" />
                <span className="text-[#5CC1B6] font-bold text-lg">You both love these!</span>
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

            {filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((name, index) => (
                  <NameCard key={`match-${index}`} name={name} />
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
              <Sparkles className="w-12 h-12 text-[#5CC1B6]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No matches yet!</h3>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">Keep swiping to find names you both love.</p>
            <Button onClick={() => navigate("/")} className="bg-[#5CC1B6] hover:bg-[#4BA89E] text-white">
              Continue Swiping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;