import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, UserMinus, AlertTriangle, UserX, Edit, Save, X as XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { partnership, resetAll } = useSwipe();
  const [loading, setLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState(profile?.first_name || '');
  const [tempEmail, setTempEmail] = useState(user?.email || '');
  const [partnerProfile, setPartnerProfile] = useState<{ first_name: string | null; email: string } | null>(null);

  const isAdmin = partnership?.user1_id === user?.id;

  // Load partner profile information
  useEffect(() => {
    const loadPartnerProfile = async () => {
      if (!partnership || !user || partnership.status !== 'active') {
        setPartnerProfile(null);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        setPartnerProfile(null);
        return;
      }

      try {
        console.log('Loading partner profile for partnerId:', partnerId);
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, email')
          .eq('user_id', partnerId)
          .maybeSingle();

        console.log('Partner profile result:', { data, error });
        if (!error && data) {
          setPartnerProfile(data);
        } else if (error) {
          console.error('Error fetching partner profile:', error);
        }
      } catch (error) {
        console.error('Error loading partner profile:', error);
      }
    };

    loadPartnerProfile();
  }, [partnership, user]);

  const handleClearSelections = async () => {
    setLoading(true);
    try {
      // Validate that user and partnership are loaded
      if (!user) {
        throw new Error('User not loaded. Please refresh the page and try again.');
      }
      
      if (!partnership) {
        throw new Error('Partnership not loaded. Please refresh the page and try again.');
      }

      console.log('Clearing selections for user:', user.id, 'in partnership:', partnership.id);
      
      // Delete user's swipes from database
      const { error } = await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('partnership_id', partnership.id);

      if (error) {
        throw error;
      }

      console.log('Database deletion completed successfully');

      // Clear local state
      resetAll();

      toast({
        title: "Selections Cleared",
        description: "All your name selections have been cleared. You can start fresh!",
      });
    } catch (error) {
      console.error('Error clearing selections:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear selections. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPartner = async () => {
    if (!partnership || !user) return;

    setLoading(true);
    try {
      // Get partner ID
      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;

      // Only delete the PARTNER's swipes, not the admin's
      if (partnerId) {
        await supabase
          .from('user_swipes')
          .delete()
          .eq('user_id', partnerId)
          .eq('partnership_id', partnership.id);
      }

      // Clear partnership_id from admin's swipes (keep the swipes, just unlink from partnership)
      await supabase
        .from('user_swipes')
        .update({ partnership_id: null })
        .eq('user_id', user.id)
        .eq('partnership_id', partnership.id);

      // Delete the partnership so user can start fresh
      await supabase
        .from('partnerships')
        .delete()
        .eq('id', partnership.id);

      toast({
        title: "Partner Disconnected",
        description: "Your partner has been disconnected. Your name selections have been preserved.",
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting partner:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect partner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeavePartnership = async () => {
    if (!partnership || !user) {
      console.error('Cannot leave partnership: missing partnership or user', { partnership, user });
      return;
    }

    setLoading(true);
    try {
      console.log('Leaving partnership:', partnership.id, 'user:', user.id);
      
      // Delete partner's (current user's) swipes - try both with and without partnership_id
      const { error: swipeError } = await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id);

      if (swipeError) {
        console.error('Error deleting swipes:', swipeError);
      }

      // Reset the partnership - call secure database function to avoid RLS issues
      const { error: partnershipError } = await supabase.rpc('leave_partnership');

      if (partnershipError) {
        console.error('Error updating partnership via RPC:', partnershipError);
        throw partnershipError;
      }

      // Notify the admin that their partner left
      await supabase
        .from('notifications')
        .insert({
          user_id: partnership.user1_id,
          type: 'partner_left',
          title: 'Partner Left',
          message: 'Your partner has left the partnership. You can invite a new partner anytime.'
        });

      // Reset user's profile preferences so they go through onboarding again when joining new partnership
      await supabase
        .from('profiles')
        .update({ 
          partner_name: null,
          preferences: null 
        })
        .eq('user_id', user.id);

      toast({
        title: "Left Partnership",
        description: "You have left the partnership. You can now join a different one.",
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error leaving partnership:', error);
      toast({
        title: "Error",
        description: "Failed to leave partnership. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeletingAccount(true);
    try {
      if (partnership) {
        const isAdmin = partnership.user1_id === user.id;
        
        if (isAdmin && partnership.user2_id) {
          // Admin is deleting their account while having a partner - transfer ownership
          await supabase
            .from('partnerships')
            .update({
              user1_id: partnership.user2_id,
              user2_id: null,
              status: 'pending' // Reset to pending so new admin can invite someone else
            })
            .eq('id', partnership.id);
            
          // Create notification for the new admin
          await supabase
            .from('notifications')
            .insert({
              user_id: partnership.user2_id,
              type: 'partnership_transferred',
              title: 'Partnership Transferred',
              message: 'You are now the admin of this partnership. Your previous partner has deleted their account.'
            });
        } else if (isAdmin && !partnership.user2_id) {
          // Admin with no partner - just delete the partnership
          await supabase
            .from('partnerships')
            .delete()
            .eq('id', partnership.id);
        } else if (!isAdmin) {
          // Partner (user2) is deleting their account - delete the partnership entirely
          // so the admin starts fresh and needs to create a new partnership
          await supabase
            .from('partnerships')
            .delete()
            .eq('id', partnership.id);
            
          // Notify the admin that their partner left and partnership was dissolved
          await supabase
            .from('notifications')
            .insert({
              user_id: partnership.user1_id,
              type: 'partner_left',
              title: 'Partner Left',
              message: 'Your partner has deleted their account and the partnership has ended. You can create a new partnership anytime.'
            });
        }
      }

      // Delete user's swipes
      await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id);

      // Delete user's notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      // Delete user's name recommendations
      await supabase
        .from('name_recommendations')
        .delete()
        .eq('user_id', user.id);

      // Delete user's profile
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Finally attempt to delete the auth user via edge function (best-effort)
      const { error } = await supabase.functions.invoke('delete-user-account');
      
      if (error) {
        console.error('Error deleting auth user (auth.users):', error);
        // We deliberately do NOT throw here so that app data deletion can still
        // be considered successful even if the auth record fails to delete.
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Sign out and redirect
      await signOut();
      navigate('/');
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleUpdateName = async () => {
    try {
      await updateProfile({ first_name: tempName });
      setEditingName(false);
      toast({
        title: "Name Updated",
        description: "Your name has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const { error } = await supabase.auth.updateUser({ email: tempEmail });
      if (error) throw error;
      
      setEditingEmail(false);
      toast({
        title: "Email Update Requested",
        description: "Check your new email address for a confirmation link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelNameEdit = () => {
    setTempName(profile?.first_name || '');
    setEditingName(false);
  };

  const cancelEmailEdit = () => {
    setTempEmail(user?.email || '');
    setEditingEmail(false);
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto"
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
            size="sm"
            onClick={() => navigate("/")}
            className="p-2 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="text-lg font-bold text-white truncate flex-1 text-center mx-4">
            Settings
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto space-y-6">
        {/* User Info */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Your Profile</h3>
          <div className="space-y-4">
            {/* Name Field */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingName && isAdmin ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="name"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Enter your name"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleUpdateName}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelNameEdit}>
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p><span className="font-medium">Name:</span> {profile?.first_name || 'Not set'}</p>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Partner Field */}
            <p>
              <span className="font-medium">Partner:</span>{' '}
              {partnerProfile 
                ? (partnerProfile.first_name || partnerProfile.email?.split('@')[0]) 
                : 'Not connected'}
            </p>

            {/* Partner Email Field */}
            {partnerProfile && (
              <p>
                <span className="font-medium">Partner Email:</span>{' '}
                {partnerProfile.email}
              </p>
            )}

            {/* Email Field */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingEmail && isAdmin ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="email"
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleUpdateEmail}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEmailEdit}>
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p><span className="font-medium">Email:</span> {user?.email}</p>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingEmail(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isAdmin ? (
              <p className="text-sm text-primary font-medium">👑 Partnership Admin</p>
            ) : (
              <p className="text-sm text-muted-foreground">👤 Partner (Settings managed by admin)</p>
            )}
          </div>
        </Card>

        {/* Clear Selections */}
        <Card className="p-6">
          <div className="flex items-start space-x-3">
            <Trash2 className="w-6 h-6 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Clear My Selections</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Remove all your liked and passed names to start fresh. This won't affect your partner's selections.
              </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={loading || !user || !partnership}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {!user || !partnership ? 'Loading...' : 'Clear My Selections'}
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Your Selections?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your liked and passed names. You'll start with a fresh slate, but your partner's selections will remain unchanged.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearSelections}>
                      Yes, Clear Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>

        {/* Admin Controls */}
        {isAdmin && partnership?.user2_id && (
          <Card className="p-6 border-destructive/20">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">Disconnect Partner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  As the partnership admin, you can disconnect your partner. Your name selections will be preserved, but your partner's selections will be removed.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading}>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Disconnect Partner
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Partner?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disconnect your partner from this partnership. Your name selections will be preserved, but your partner's selections will be removed. You'll need to invite them again if you want to continue together.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnectPartner}>
                        Yes, Disconnect Partner
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}

        {/* Partner Leave Partnership Option */}
        {!isAdmin && partnership?.user2_id === user?.id && (
          <Card className="p-6 border-destructive/20">
            <div className="flex items-start space-x-3">
              <UserMinus className="w-6 h-6 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">Leave Partnership</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Disconnect from your current partner and join a different partnership. Your name selections for this partnership will be removed.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading}>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Leave Partnership
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave Partnership?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disconnect you from your current partner. Your name selections will be removed and you'll be able to join a different partnership. The admin will need to create a new partnership.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeavePartnership}>
                        Yes, Leave Partnership
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}

        {/* Delete Account */}
        <Card className="p-6 border-destructive/50 bg-white">
          <div className="flex items-start space-x-3">
            <UserX className="w-6 h-6 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Delete Account</h3>
              <div className="text-sm text-muted-foreground mb-4 space-y-2">
                <p><strong>⚠️ This action cannot be undone.</strong></p>
                <p>Deleting your account will permanently remove:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>All your name selections and preferences</li>
                  <li>Your profile and account data</li>
                  <li>All notifications and recommendations</li>
                </ul>
                {partnership && partnership.user1_id === user?.id && partnership.user2_id && (
                  <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <p className="text-warning-foreground font-medium">
                      🔄 Partnership Transfer: Since you're the admin, ownership will be transferred to your partner. 
                      They'll become the new admin and can continue using the partnership.
                    </p>
                  </div>
                )}
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deletingAccount}>
                    <UserX className="w-4 h-4 mr-2" />
                    {deletingAccount ? 'Deleting...' : 'Delete My Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <span>Delete Account Forever?</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>This will <strong>permanently delete your account</strong> and all associated data:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Profile information and preferences</li>
                        <li>All name selections (likes and passes)</li>
                        <li>Notifications and recommendations</li>
                        <li>Account access and login credentials</li>
                      </ul>
                      
                      {partnership && partnership.user1_id === user?.id && partnership.user2_id && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-blue-800 font-medium text-sm">
                            Your partner will become the new partnership admin and can continue using the service.
                          </p>
                        </div>
                      )}
                      
                      <p className="font-medium text-destructive">
                        This action cannot be undone. Are you absolutely sure?
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;