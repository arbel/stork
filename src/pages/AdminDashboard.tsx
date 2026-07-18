import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Shield, 
  LogOut, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Upload, 
  Download,
  Trash2,
  Globe,
  Languages,
  Users,
  Database,
  Home,
  BarChart3,
  MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HebrewNamesCrawler } from "@/components/HebrewNamesCrawler";
import { NameOccurrencesUploader } from "@/components/NameOccurrencesUploader";
import { GenderDistributionBar } from "@/components/GenderDistributionBar";
import { NameCleanup } from "@/components/NameCleanup";
import { AdminUsageStats } from "@/components/AdminUsageStats";
import { AdminFeedback } from "@/components/AdminFeedback";

interface Name {
  id: string;
  name: string;
  display_name?: string;
  gender: 'male' | 'female' | 'unisex';
  origin?: string;
  meaning?: string;
  description?: string;
  language: string;
  region: string;
  popularity_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  male_occurrences?: number;
  female_occurrences?: number;
}

const AdminDashboard = () => {
  const [names, setNames] = useState<Name[]>([]);
  const [filteredNames, setFilteredNames] = useState<Name[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState<string>("all");
  const [editingName, setEditingName] = useState<Name | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({
    totalNames: 0,
    languages: 0,
    regions: 0,
    activeNames: 0
  });

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'he', name: 'Hebrew' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'hi', name: 'Hindi' }
  ];

  const regions = [
    { code: 'US', name: 'United States' },
    { code: 'IL', name: 'Israel' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' }
  ];

  useEffect(() => {
    // Only check admin auth from localStorage - no Supabase calls
    const isAuthenticated = localStorage.getItem("admin_authenticated");
    const loginTime = localStorage.getItem("admin_login_time");
    
    if (!isAuthenticated || isAuthenticated !== "true") {
      navigate('/admin/login');
      return;
    }

    // Check if session is still valid (24 hours)
    if (loginTime) {
      const loginTimestamp = parseInt(loginTime);
      const currentTime = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (currentTime - loginTimestamp > twentyFourHours) {
        localStorage.removeItem("admin_authenticated");
        localStorage.removeItem("admin_login_time");
        navigate('/admin/login');
        return;
      }
    }

    // Admin is authenticated, load data
    loadNames();
    setLoading(false);

    // Subscribe to real-time updates for names table
    const channel = supabase
      .channel('names-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'names'
      }, () => {
        loadNames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  useEffect(() => {
    filterNames();
    setCurrentPage(1); // Reset to first page when filters change
  }, [names, searchTerm, selectedLanguage, selectedRegion, selectedGender, selectedLetter]);

  const loadNames = async () => {
    setLoading(true);
    try {
      // Fetch ALL names - Supabase has a default 1000 limit, so we need to paginate
      let allNames: Name[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('names')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allNames = [...allNames, ...data as Name[]];
          from += pageSize;
          hasMore = data.length === pageSize; // Continue if we got a full page
        } else {
          hasMore = false;
        }
      }

      console.log('Loaded names from database:', allNames.length, 'names');
      console.log('Sample names:', allNames.slice(0, 3));
      
      setNames(allNames);
      
      // Calculate stats
      const totalNames = allNames.length;
      const languages = new Set(allNames.map(n => n.language)).size;
      const regions = new Set(allNames.map(n => n.region)).size;
      const activeNames = allNames.filter(n => n.is_active).length;
      
      setStats({ totalNames, languages, regions, activeNames });
    } catch (error: any) {
      console.error('Error loading names:', error);
      toast({
        title: "Error Loading Names",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNames = () => {
    let filtered = names;
    
    console.log('Filtering names:', {
      totalNames: names.length,
      searchTerm,
      selectedLanguage,
      selectedRegion,
      selectedGender,
      selectedLetter
    });

    if (searchTerm) {
      filtered = filtered.filter(name => 
        name.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.meaning?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.origin?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search filter:', filtered.length);
    }

    if (selectedLanguage !== "all") {
      filtered = filtered.filter(name => name.language === selectedLanguage);
      console.log('After language filter:', filtered.length);
    }

    if (selectedRegion !== "all") {
      filtered = filtered.filter(name => name.region === selectedRegion);
      console.log('After region filter:', filtered.length);
    }

    if (selectedGender !== "all") {
      filtered = filtered.filter(name => name.gender === selectedGender);
      console.log('After gender filter:', filtered.length);
    }

    if (selectedLetter !== "all") {
      filtered = filtered.filter(name => {
        const firstChar = name.name.charAt(0).toLowerCase();
        return firstChar === selectedLetter.toLowerCase();
      });
      console.log('After letter filter:', filtered.length);
    }

    console.log('Final filtered names:', filtered.length);
    setFilteredNames(filtered);
  };

  // Get letter groups with counts for the current language
  const getLetterGroups = () => {
    if (selectedLanguage === "all") return [];
    
    const letterCounts: { [key: string]: number } = {};
    
    names
      .filter(name => name.language === selectedLanguage)
      .forEach(name => {
        const firstChar = name.name.charAt(0);
        if (firstChar) {
          letterCounts[firstChar] = (letterCounts[firstChar] || 0) + 1;
        }
      });
    
    return Object.entries(letterCounts)
      .sort((a, b) => a[0].localeCompare(b[0], selectedLanguage === 'he' ? 'he' : 'en'))
      .map(([letter, count]) => ({ letter, count }));
  };

  const letterGroups = getLetterGroups();

  // Pagination calculations
  const totalPages = Math.ceil(filteredNames.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNames = filteredNames.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    document.querySelector('.names-table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    // Clear admin session from localStorage
    localStorage.removeItem("admin_authenticated");
    localStorage.removeItem("admin_login_time");
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    navigate('/admin/login');
  };

  const handleSaveName = async (nameData: Partial<Name>) => {
    try {
      if (editingName) {
        // Update existing name
        const { error } = await supabase
          .from('names')
          .update({
            ...nameData,
            updated_by: null, // Admin operation
            updated_at: new Date().toISOString()
          })
          .eq('id', editingName.id);

        if (error) throw error;
        toast({ title: "Name updated successfully!" });
      } else {
        // Create new name
        const { error } = await supabase
          .from('names')
          .insert([{
            name: nameData.name!,
            display_name: nameData.display_name || null,
            gender: nameData.gender!,
            origin: nameData.origin || null,
            meaning: nameData.meaning || null,
            description: nameData.description || null,
            language: nameData.language || 'en',
            region: nameData.region || 'US',
            popularity_score: nameData.popularity_score || 0,
            is_active: nameData.is_active !== undefined ? nameData.is_active : true,
            created_by: null // Admin operation
          }]);

        if (error) throw error;
        toast({ title: "Name added successfully!" });
      }

      setEditingName(null);
      setShowAddDialog(false);
      loadNames();
    } catch (error: any) {
      toast({
        title: "Error saving name",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteName = async (id: string) => {
    if (!confirm("Are you sure you want to delete this name?")) return;

    try {
      console.log('Attempting to delete name with id:', id);
      
      const { data, error } = await supabase
        .from('names')
        .delete()
        .eq('id', id)
        .select();

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      toast({ title: "Name deleted successfully!" });
      
      // Remove from local state immediately for better UX
      setNames(prev => prev.filter(n => n.id !== id));
      setFilteredNames(prev => prev.filter(n => n.id !== id));
      
      // Reload to ensure consistency
      await loadNames();
    } catch (error: any) {
      console.error('Error in handleDeleteName:', error);
      toast({
        title: "Error deleting name",
        description: error.message || "Failed to delete name",
        variant: "destructive",
      });
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const namesToInsert = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const nameObj: any = { created_by: null }; // Admin import
        
        headers.forEach((header, index) => {
          if (values[index]) {
            switch (header) {
              case 'name':
                nameObj.name = values[index];
                break;
              case 'display_name':
              case 'displayname':
                nameObj.display_name = values[index];
                break;
              case 'gender':
                nameObj.gender = values[index].toLowerCase();
                break;
              case 'origin':
                nameObj.origin = values[index];
                break;
              case 'meaning':
                nameObj.meaning = values[index];
                break;
              case 'description':
                nameObj.description = values[index];
                break;
              case 'language':
                nameObj.language = values[index].toLowerCase();
                break;
              case 'region':
                nameObj.region = values[index].toUpperCase();
                break;
              case 'popularity_score':
              case 'popularity':
                nameObj.popularity_score = parseInt(values[index]) || 0;
                break;
            }
          }
        });

        if (nameObj.name && nameObj.gender) {
          namesToInsert.push(nameObj);
        }
      }

      if (namesToInsert.length === 0) {
        toast({
          title: "No valid names found",
          description: "Please check your CSV format.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('names')
        .insert(namesToInsert);

      if (error) throw error;

      toast({
        title: "CSV uploaded successfully!",
        description: `Added ${namesToInsert.length} names.`,
      });

      setCsvFile(null);
      loadNames();
    } catch (error: any) {
      toast({
        title: "Error uploading CSV",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePopulateFromData = async () => {
    if (!confirm("This will populate the database with names from the code. Continue?")) return;

    setLoading(true);
    try {
      const { populateNamesFromData } = await import("@/utils/populateNames");
      const result = await populateNamesFromData();
      
      if (result.success) {
        toast({
          title: "Population successful!",
          description: result.message,
        });
        loadNames();
      } else {
        toast({
          title: "Population failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error populating names",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGendersBasedOnOccurrences = async () => {
    if (!confirm("This will update gender values based on male/female occurrence percentages (>70% = specific gender, otherwise unisex). Continue?")) return;

    setLoading(true);
    try {
      const namesToUpdate = names.filter(name => {
        const maleOcc = name.male_occurrences || 0;
        const femaleOcc = name.female_occurrences || 0;
        const total = maleOcc + femaleOcc;
        
        if (total === 0) return false;
        
        const malePercentage = (maleOcc / total) * 100;
        const femalePercentage = (femaleOcc / total) * 100;
        
        let newGender: 'male' | 'female' | 'unisex';
        if (malePercentage > 70) {
          newGender = 'male';
        } else if (femalePercentage > 70) {
          newGender = 'female';
        } else {
          newGender = 'unisex';
        }
        
        return name.gender !== newGender;
      });

      if (namesToUpdate.length === 0) {
        toast({
          title: "No updates needed",
          description: "All names already have correct gender values based on occurrences.",
        });
        setLoading(false);
        return;
      }

      // Update names in batches
      for (const name of namesToUpdate) {
        const maleOcc = name.male_occurrences || 0;
        const femaleOcc = name.female_occurrences || 0;
        const total = maleOcc + femaleOcc;
        const malePercentage = (maleOcc / total) * 100;
        const femalePercentage = (femaleOcc / total) * 100;
        
        let newGender: 'male' | 'female' | 'unisex';
        if (malePercentage > 70) {
          newGender = 'male';
        } else if (femalePercentage > 70) {
          newGender = 'female';
        } else {
          newGender = 'unisex';
        }

        const { error } = await supabase
          .from('names')
          .update({ gender: newGender })
          .eq('id', name.id);

        if (error) throw error;
      }

      toast({
        title: "Genders updated successfully!",
        description: `Updated ${namesToUpdate.length} names based on occurrence data.`,
      });
      
      loadNames();
    } catch (error: any) {
      toast({
        title: "Error updating genders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['name', 'display_name', 'gender', 'origin', 'meaning', 'description', 'language', 'region', 'popularity_score', 'is_active', 'male_occurrences', 'female_occurrences'].join(','),
      ...filteredNames.map(name => [
        name.name,
        name.display_name || '',
        name.gender,
        name.origin || '',
        name.meaning || '',
        name.description || '',
        name.language,
        name.region,
        name.popularity_score,
        name.is_active,
        name.male_occurrences || 0,
        name.female_occurrences || 0
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `names-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stork Admin Panel</h1>
            <p className="text-muted-foreground">Name Management System</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Tabs for different admin sections */}
      <Tabs defaultValue="usage" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="names" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Names Management
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Usage Stats
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="flex-1">
          <AdminUsageStats />
        </TabsContent>

        <TabsContent value="feedback" className="flex-1">
          <AdminFeedback />
        </TabsContent>

        <TabsContent value="names" className="flex-1 flex flex-col">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Database className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalNames}</p>
                  <p className="text-sm text-muted-foreground">Total Names</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Languages className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.languages}</p>
                  <p className="text-sm text-muted-foreground">Languages</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Globe className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.regions}</p>
                  <p className="text-sm text-muted-foreground">Regions</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeNames}</p>
                  <p className="text-sm text-muted-foreground">Active Names</p>
                </div>
              </div>
            </Card>
          </div>

      {/* Controls */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search names, meanings, origins... (press Enter)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchTerm(searchInput);
                  }
                }}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region.code} value={region.code}>{region.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Name
          </Button>
          
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
            {csvFile && (
              <Button onClick={handleCsvUpload}>
                Import {csvFile.name}
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>

          <Button 
            variant="outline" 
            onClick={handlePopulateFromData}
            disabled={loading}
          >
            <Database className="w-4 h-4 mr-2" />
            Populate from Code
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Globe className="w-4 h-4 mr-2" />
                Crawl Hebrew Names
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crawl Hebrew Names from Shemli.co.il</DialogTitle>
              </DialogHeader>
              <HebrewNamesCrawler />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Occurrences
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Name Occurrences Data</DialogTitle>
              </DialogHeader>
              <NameOccurrencesUploader />
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            onClick={handleUpdateGendersBasedOnOccurrences}
            disabled={loading}
          >
            <Filter className="w-4 h-4 mr-2" />
            Update Genders by Distribution
          </Button>
        </div>
      </Card>

      {/* Name Cleanup Card */}
      <div className="mb-6">
        <NameCleanup />
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap gap-3">
        </div>
      </Card>

      {/* Letter Filter - Only show when a language is selected */}
      {selectedLanguage !== "all" && letterGroups.length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-medium mb-3">Filter by First Letter</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={selectedLetter === "all" ? "default" : "outline"}
              onClick={() => setSelectedLetter("all")}
            >
              All
            </Button>
            {letterGroups.map(({ letter, count }) => (
              <Button
                key={letter}
                size="sm"
                variant={selectedLetter === letter ? "default" : "outline"}
                onClick={() => setSelectedLetter(letter)}
                className="min-w-[60px]"
              >
                {letter} <span className="ml-1 text-xs opacity-70">({count})</span>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Results count and pagination info */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredNames.length)} of {filteredNames.length} names
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Names Table */}
      <Card className="overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 names-table-container">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Gender</th>
                <th className="text-left p-4 font-medium">Male</th>
                <th className="text-left p-4 font-medium">Female</th>
                <th className="text-left p-4 font-medium">Distribution</th>
                <th className="text-left p-4 font-medium">Language</th>
                <th className="text-left p-4 font-medium">Region</th>
                <th className="text-left p-4 font-medium">Origin</th>
                <th className="text-left p-4 font-medium">Meaning</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedNames.map((name) => (
                <tr key={name.id} className="border-t hover:bg-muted/25">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{name.name}</div>
                      {name.display_name && (
                        <div className="text-sm text-muted-foreground">{name.display_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={
                      name.gender === 'male' ? 'default' : 
                      name.gender === 'female' ? 'secondary' : 'outline'
                    }>
                      {name.gender}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-mono">
                      {name.male_occurrences?.toLocaleString() || '0'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-mono">
                      {name.female_occurrences?.toLocaleString() || '0'}
                    </span>
                  </td>
                  <td className="p-4 min-w-[200px]">
                    <GenderDistributionBar 
                      maleOccurrences={name.male_occurrences || 0}
                      femaleOccurrences={name.female_occurrences || 0}
                    />
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {languages.find(l => l.code === name.language)?.name || name.language}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {regions.find(r => r.code === name.region)?.name || name.region}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{name.origin || '-'}</td>
                  <td className="p-4 text-sm max-w-[200px] truncate" title={name.meaning}>
                    {name.meaning || '-'}
                  </td>
                  <td className="p-4">
                    <Badge variant={name.is_active ? 'default' : 'destructive'}>
                      {name.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingName(name)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteName(name.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {paginatedNames.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No names found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(1)}
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="text-muted-foreground">...</span>}
                </>
              )}
              
              {/* Pages around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === currentPage || 
                         page === currentPage - 1 || 
                         page === currentPage + 1 ||
                         page === currentPage - 2 ||
                         page === currentPage + 2;
                })
                .map(page => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
              
              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="text-muted-foreground">...</span>}
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

        </TabsContent>
      </Tabs>

      {/* Edit/Add Name Dialog */}
      <NameEditDialog
        name={editingName}
        isOpen={editingName !== null || showAddDialog}
        onClose={() => {
          setEditingName(null);
          setShowAddDialog(false);
        }}
        onSave={handleSaveName}
        languages={languages}
        regions={regions}
      />
    </div>
  );
};

// Name Edit Dialog Component
const NameEditDialog = ({ 
  name, 
  isOpen, 
  onClose, 
  onSave, 
  languages, 
  regions 
}: {
  name: Name | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Name>) => void;
  languages: Array<{code: string, name: string}>;
  regions: Array<{code: string, name: string}>;
}) => {
  const [formData, setFormData] = useState<Partial<Name>>({
    name: '',
    display_name: '',
    gender: 'unisex',
    origin: '',
    meaning: '',
    description: '',
    language: 'en',
    region: 'US',
    popularity_score: 0,
    is_active: true
  });

  useEffect(() => {
    if (name) {
      setFormData(name);
    } else {
      setFormData({
        name: '',
        display_name: '',
        gender: 'unisex',
        origin: '',
        meaning: '',
        description: '',
        language: 'en',
        region: 'US',
        popularity_score: 0,
        is_active: true
      });
    }
  }, [name]);

  const handleSubmit = () => {
    if (!formData.name || !formData.gender) {
      toast({
        title: "Missing required fields",
        description: "Name and gender are required.",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name ? 'Edit Name' : 'Add New Name'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name || ''}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="Display name (e.g., Hebrew characters)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <Select 
              value={formData.gender} 
              onValueChange={(value) => setFormData({...formData, gender: value as any})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="unisex">Unisex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin">Origin</Label>
            <Input
              id="origin"
              value={formData.origin || ''}
              onChange={(e) => setFormData({...formData, origin: e.target.value})}
              placeholder="Name origin (e.g., Hebrew, Latin)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={formData.language} 
              onValueChange={(value) => setFormData({...formData, language: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select 
              value={formData.region} 
              onValueChange={(value) => setFormData({...formData, region: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map(region => (
                  <SelectItem key={region.code} value={region.code}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="meaning">Meaning</Label>
            <Input
              id="meaning"
              value={formData.meaning || ''}
              onChange={(e) => setFormData({...formData, meaning: e.target.value})}
              placeholder="Name meaning"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional description or notes"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="popularity_score">Popularity Score</Label>
            <Input
              id="popularity_score"
              type="number"
              min="0"
              max="100"
              value={formData.popularity_score}
              onChange={(e) => setFormData({...formData, popularity_score: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_active">Status</Label>
            <Select 
              value={formData.is_active ? 'active' : 'inactive'} 
              onValueChange={(value) => setFormData({...formData, is_active: value === 'active'})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {name ? 'Update' : 'Add'} Name
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboard;