import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import LocationInput from "./LocationInput.jsx";

function AccountIcon({ name, size = 18 }) {
  const paths = {
    mountain: <><path d="m2 20 7-13 4 7 3-5 6 11H2Z" /><path d="m7 11 2 2 2-1M14 12l2 2 2-1" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AuthPage({ mode, navigate }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoordinates, setLocationCoordinates] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!supabase) {
      setError("Supabase is not configured. Add your project URL and publishable key to .env.local, then restart Vite.");
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    if ((isSignup || isReset) && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim(),
              username: username.trim().toLowerCase().replace(/^@/, ""),
              location: location.trim(),
              location_lat: locationCoordinates?.latitude ?? null,
              location_lon: locationCoordinates?.longitude ?? null,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) throw authError;
        if (data.session) navigate("/profile");
        else setNotice("Check your inbox for a confirmation link. Your rider account will be ready when you confirm your email.");
      } else if (isForgot) {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (authError) throw authError;
        setNotice("If an account exists for that email, a password reset link is on its way.");
      } else if (isReset) {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setNotice("Your password has been updated.");
        window.setTimeout(() => navigate("/profile"), 900);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        navigate("/");
      }
    } catch (authError) {
      setError(authError.message || "We couldn't complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const heading = isSignup ? "Your mountain people." : isForgot ? "Find your way back." : isReset ? "A fresh start." : "Welcome back.";
  return (
    <div className="auth-page">
      <section className="auth-art">
        <a className="brand auth-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
          <span className="brand-mark"><AccountIcon name="mountain" size={23} /></span><span>skiup<span className="brand-period">.</span></span>
        </a>
        <div className="auth-art-copy">
          <span className="auth-art-eyebrow">✳ &nbsp;THE MOUNTAIN IS BETTER TOGETHER</span>
          <h1>Find your<br />people.<br /><span>Find your line.</span></h1>
          <p>One place for your favorite runs, familiar faces, and the days you never want to forget.</p>
        </div>
        <span className="auth-art-coordinate">50°07' N · 122°57' W</span>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <button className="auth-back" onClick={() => navigate("/")}>← Back to Skiup</button>
          <span className="eyebrow">{isSignup ? "YOUR NEXT CHAPTER" : isForgot ? "ACCOUNT RECOVERY" : isReset ? "ACCOUNT SECURITY" : "GOOD TO SEE YOU AGAIN"}</span>
          <h2>{heading}</h2>
          <p className="auth-description">{isSignup ? "Create your account and make this mountain yours." : isForgot ? "Enter the email on your account and we'll send a reset link." : isReset ? "Choose a new password for your Skiup account." : "Sign in to pick up right where you left off."}</p>
          {!supabase && <div className="auth-error" role="alert">Add the Supabase project URL and public key to <code>.env.local</code>, then restart the app.</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && <>
              <label className="account-label" htmlFor="signup-name">RIDER NAME</label>
              <input id="signup-name" className="account-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={50} required placeholder="How should we call you?" />
              <label className="account-label" htmlFor="signup-username">USERNAME</label>
              <div className="input-prefix"><span>@</span><input id="signup-username" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} autoComplete="username" minLength={3} maxLength={24} required placeholder="yourtrailname" /></div>
              <label className="account-label" htmlFor="signup-location">HOME MOUNTAIN / LOCATION <span>OPTIONAL</span></label>
              <LocationInput
                id="signup-location"
                value={location}
                onChange={setLocation}
                onSelect={setLocationCoordinates}
                placeholder="City, resort, or region"
              />
            </>}
            {!isReset && <>
              <label className="account-label" htmlFor="auth-email">EMAIL</label>
              <input id="auth-email" className="account-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" />
            </>}
            {!isForgot && <>
              <label className="account-label" htmlFor="auth-password">{isReset ? "NEW PASSWORD" : "PASSWORD"}</label>
              <input id="auth-password" className="account-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup || isReset ? "new-password" : "current-password"} minLength={isSignup || isReset ? 8 : undefined} required placeholder={isSignup || isReset ? "At least 8 characters" : "Your password"} />
            </>}
            {isSignup && <>
              <label className="account-label" htmlFor="confirm-password">CONFIRM PASSWORD</label>
              <input id="confirm-password" className="account-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required placeholder="Enter your password again" />
            </>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={busy || !supabase}>
              {busy ? "One moment..." : isSignup ? "Create your account" : isForgot ? "Send reset link" : isReset ? "Update password" : "Sign in"}
              {!busy && <AccountIcon name="arrow" size={16} />}
            </button>
          </form>
          {mode === "login" && <button className="text-link forgot-link" onClick={() => navigate("/forgot-password")}>Forgot password?</button>}
          {mode === "login" && <p className="auth-switch">New to Skiup? <button onClick={() => navigate("/signup")}>Create an account</button></p>}
          {mode === "signup" && <p className="auth-switch">Already riding with us? <button onClick={() => navigate("/login")}>Sign in</button></p>}
          {(isForgot || isReset) && <p className="auth-switch"><button onClick={() => navigate("/login")}>Return to sign in</button></p>}
          <p className="auth-terms">By continuing, you agree to keep it kind out there.</p>
        </div>
      </section>
    </div>
  );
}

export function SettingsPage({ session, profile, preferences, onProfileChange, onPreferenceChange, onSignOut }) {
  const [tab, setTab] = useState("profile");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [locationCoordinates, setLocationCoordinates] = useState(
    preferences?.location_lat != null && preferences?.location_lon != null
      ? { latitude: preferences.location_lat, longitude: preferences.location_lon }
      : null,
  );
  const [discipline, setDiscipline] = useState(profile?.discipline || "Skier");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [email, setEmail] = useState(session.user.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privateProfile, setPrivateProfile] = useState(profile?.profile_visibility === "private");
  const [emailNotifications, setEmailNotifications] = useState(preferences?.email_notifications ?? true);
  const [busy, setBusy] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");
    setLocation(profile?.location || "");
    setLocationCoordinates(
      preferences?.location_lat != null && preferences?.location_lon != null
        ? { latitude: preferences.location_lat, longitude: preferences.location_lon }
        : null,
    );
    setDiscipline(profile?.discipline || "Skier");
    setCoverUrl(profile?.cover_url || "");
    setPrivateProfile(profile?.profile_visibility === "private");
  }, [profile, preferences]);
  useEffect(() => {
    setEmailNotifications(preferences?.email_notifications ?? true);
  }, [preferences]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function clearFeedback() {
    setError("");
    setNotice("");
  }

  async function saveProfile(event) {
    event.preventDefault();
    clearFeedback();
    const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError("Usernames must be 3–24 characters and use only letters, numbers, and underscores.");
      return;
    }
    if (avatarFile && (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type) || avatarFile.size > 5 * 1024 * 1024)) {
      setError("Choose a JPG, PNG, or WebP profile photo under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      let avatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const imagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("profile-images").upload(imagePath, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("profile-images").getPublicUrl(imagePath);
        avatarUrl = data.publicUrl;
      }
      const { data, error: saveError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        username: normalizedUsername,
        display_name: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        discipline,
        avatar_url: avatarUrl,
        cover_url: coverUrl.trim() || null,
        profile_visibility: profile?.profile_visibility || "public",
        updated_at: new Date().toISOString(),
      }).select().single();
      if (saveError) throw saveError;
      onProfileChange(data);
      const { data: savedPreferences, error: preferencesError } = await supabase
        .from("profile_preferences")
        .upsert({
          id: session.user.id,
          email_notifications: preferences?.email_notifications ?? true,
          location_lat: locationCoordinates?.latitude ?? null,
          location_lon: locationCoordinates?.longitude ?? null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (preferencesError) throw new Error(`Your profile was saved, but its private location settings could not be saved: ${preferencesError.message}`);
      onPreferenceChange(savedPreferences);
      setAvatarFile(null);
      setNotice("Your rider profile is up to date.");
    } catch (saveError) {
      setError(saveError.message || "We couldn't save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAvatar() {
    clearFeedback();
    if (!avatarFile) {
      setError("Choose a profile photo first.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type) || avatarFile.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP profile photo under 5 MB.");
      return;
    }
    setSavingAvatar(true);
    let imagePath = "";
    try {
      const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
      imagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-images").upload(imagePath, avatarFile, {
        contentType: avatarFile.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("profile-images").getPublicUrl(imagePath);
      const { data, error: profileError } = await supabase.from("profiles")
        .update({ avatar_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", session.user.id).select().single();
      if (profileError) {
        const { error: cleanupError } = await supabase.storage.from("profile-images").remove([imagePath]);
        throw new Error(`The photo uploaded, but your profile could not be updated: ${profileError.message}${cleanupError ? ` The unused image could not be removed: ${cleanupError.message}` : ""}`);
      }
      onProfileChange(data);
      setAvatarFile(null);
      setNotice("Your profile photo has been updated.");
    } catch (saveError) {
      const detail = saveError.message || "We couldn't save your profile photo.";
      const setupHint = /bucket|policy|row-level|permission denied/i.test(detail)
        ? " Check that the profile-images Storage bucket and its policies from supabase/schema.sql are installed in this Supabase project."
        : "";
      setError(`${detail}${setupHint}`);
    } finally {
      setSavingAvatar(false);
    }
  }

  async function saveEmail(event) {
    event.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
      if (updateError) throw updateError;
      setNotice("Check your inbox to confirm the email address change.");
    } catch (updateError) {
      setError(updateError.message || "We couldn't update your email.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    clearFeedback();
    if (newPassword.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password has been changed.");
    } catch (updateError) {
      setError(updateError.message || "We couldn't change your password.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePreference(field, value) {
    clearFeedback();
    const previousValue = field === "profile_visibility" ? privateProfile : emailNotifications;
    if (field === "profile_visibility") setPrivateProfile(value === "private");
    else setEmailNotifications(value);
    try {
      const { data, error: updateError } = field === "profile_visibility"
        ? await supabase.from("profiles")
          .update({ profile_visibility: value, updated_at: new Date().toISOString() })
          .eq("id", session.user.id)
          .select()
          .single()
        : await supabase.from("profile_preferences")
          .upsert({ id: session.user.id, email_notifications: value, updated_at: new Date().toISOString() })
          .select()
          .single();
      if (updateError) throw updateError;
      if (field === "profile_visibility") onProfileChange(data);
      else onPreferenceChange(data);
      setNotice("Your preference has been saved.");
    } catch (updateError) {
      if (field === "profile_visibility") setPrivateProfile(previousValue);
      else setEmailNotifications(previousValue);
      setError(updateError.message || "We couldn't save that preference.");
    }
  }

  const tabs = [
    { id: "profile", label: "Rider profile", icon: "user" },
    { id: "account", label: "Login & security", icon: "lock" },
    { id: "privacy", label: "Privacy & email", icon: "shield" },
  ];

  return (
    <section className="settings-page">
      <header className="page-heading settings-heading"><div><p className="eyebrow">YOUR ACCOUNT, YOUR CALL</p><h1>Make it yours<span className="heading-period">.</span></h1><p className="page-subtitle">Shape your profile and decide how you show up out there.</p></div><button className="sign-out-button" onClick={onSignOut}>Sign out</button></header>
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Account settings sections">
          {tabs.map((item) => <button key={item.id} className={`settings-tab ${tab === item.id ? "active" : ""}`} onClick={() => { setTab(item.id); clearFeedback(); }}><AccountIcon name={item.icon} size={17} />{item.label}<span className="settings-tab-chevron">›</span></button>)}
          <div className="settings-account"><span className="settings-account-avatar">{(profile?.display_name || session.user.email || "R").slice(0, 1).toUpperCase()}</span><div><strong>{profile?.display_name || "Mountain rider"}</strong><span>{session.user.email}</span></div></div>
        </nav>
        <div className="settings-content">
          {tab === "profile" && <form className="settings-section" onSubmit={saveProfile}>
            <div className="settings-section-heading"><div><h2>Rider profile</h2><p>This is how other riders will find you.</p></div><span className="settings-step">01 / 03</span></div>
            {error && <p className="settings-message error" role="alert">{error}</p>}
            {notice && <p className="settings-message success" role="status">{notice}</p>}
            <div className="photo-editor"><div className="photo-preview">{avatarPreview || profile?.avatar_url ? <img src={avatarPreview || profile.avatar_url} alt="Profile preview" /> : <span>{(displayName || "R").slice(0, 1).toUpperCase()}</span>}</div><div><strong>Your profile photo</strong><p>JPG, PNG or WebP. 5 MB max.</p><div className="photo-actions"><label className="secondary-button" htmlFor="profile-photo">Choose photo</label><button className="secondary-button" type="button" onClick={saveAvatar} disabled={!avatarFile || savingAvatar}>{savingAvatar ? "Uploading…" : "Save photo"}</button></div><input id="profile-photo" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setAvatarFile(event.target.files[0] || null); clearFeedback(); }} /></div></div>
            <label className="account-label" htmlFor="profile-display-name">DISPLAY NAME</label>
            <input id="profile-display-name" className="account-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={50} required />
            <label className="account-label" htmlFor="profile-username">USERNAME</label>
            <div className="input-prefix"><span>@</span><input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} minLength={3} maxLength={24} required /></div>
            <label className="account-label" htmlFor="profile-bio">YOUR BIO <span>{bio.length}/280</span></label>
            <textarea id="profile-bio" className="account-input account-textarea" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} placeholder="What keeps bringing you back to the mountain?" />
            <div className="settings-two-column"><div><label className="account-label" htmlFor="profile-location">HOME MOUNTAIN / LOCATION</label><LocationInput id="profile-location" value={location} onChange={setLocation} onSelect={setLocationCoordinates} placeholder="Whistler, BC" /></div><div><label className="account-label" htmlFor="profile-discipline">YOUR RIDE</label><select id="profile-discipline" className="account-input account-select" value={discipline} onChange={(event) => setDiscipline(event.target.value)}>{["Skier", "Snowboarder", "Freeride skier", "Freestyle skier", "Splitboarder", "Other"].map((item) => <option key={item}>{item}</option>)}</select></div></div>
            <label className="account-label" htmlFor="profile-cover">COVER IMAGE URL <span>OPTIONAL</span></label>
            <input id="profile-cover" className="account-input" type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://..." />
            <div className="settings-save-row"><span>Profile updates are saved to your account.</span><button className="primary-button" type="submit" disabled={busy || savingAvatar}>{busy || savingAvatar ? "Saving..." : "Save profile"} <AccountIcon name="arrow" size={15} /></button></div>
          </form>}
          {tab === "account" && <div className="settings-section">
            <div className="settings-section-heading"><div><h2>Login & security</h2><p>Keep your account details current and secure.</p></div><span className="settings-step">02 / 03</span></div>
            {error && <p className="settings-message error" role="alert">{error}</p>}
            {notice && <p className="settings-message success" role="status">{notice}</p>}
            <form onSubmit={saveEmail}><label className="account-label" htmlFor="account-email">EMAIL ADDRESS</label><input id="account-email" className="account-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><p className="settings-help">Supabase will send a confirmation link before changing your email.</p><button className="secondary-button settings-action" type="submit" disabled={busy}>Update email</button></form>
            <div className="settings-divider" />
            <form onSubmit={savePassword}><label className="account-label" htmlFor="new-password">NEW PASSWORD</label><input id="new-password" className="account-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="At least 8 characters" /><label className="account-label" htmlFor="confirm-new-password">CONFIRM NEW PASSWORD</label><input id="confirm-new-password" className="account-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="Enter the new password again" /><button className="primary-button settings-action" type="submit" disabled={busy}>Change password <AccountIcon name="arrow" size={15} /></button></form>
            <div className="settings-divider" />
            <div className="settings-signout"><div><strong>Finished for today?</strong><p>You can sign back in any time.</p></div><button className="secondary-button" onClick={onSignOut}>Sign out</button></div>
          </div>}
          {tab === "privacy" && <div className="settings-section">
            <div className="settings-section-heading"><div><h2>Privacy & email</h2><p>Choose what feels right for your time on the mountain.</p></div><span className="settings-step">03 / 03</span></div>
            {error && <p className="settings-message error" role="alert">{error}</p>}
            {notice && <p className="settings-message success" role="status">{notice}</p>}
            <div className="preference-row"><span className="preference-icon"><AccountIcon name="shield" size={18} /></span><span className="preference-copy"><strong>Private profile</strong><small>{privateProfile ? "Only you can see your rider profile." : "Your rider profile can be discovered by everyone."}</small></span><label className="toggle-control"><input type="checkbox" checked={privateProfile} onChange={(event) => updatePreference("profile_visibility", event.target.checked ? "private" : "public")} /><span /></label></div>
            <div className="settings-divider" />
            <div className="preference-row"><span className="preference-icon"><AccountIcon name="bell" size={18} /></span><span className="preference-copy"><strong>Occasional email updates</strong><small>Get important account and community updates by email.</small></span><label className="toggle-control"><input type="checkbox" checked={emailNotifications} onChange={(event) => updatePreference("email_notifications", event.target.checked)} /><span /></label></div>
            <div className="settings-privacy-note"><AccountIcon name="lock" size={17} /><p>Your email address and password are private and are never shown on your rider profile.</p></div>
          </div>}
        </div>
      </div>
    </section>
  );
}
