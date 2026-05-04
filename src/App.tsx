import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Boot } from "./screens/Boot";
import { ProfileSelect } from "./screens/ProfileSelect";
import { Login } from "./screens/Login";
import { Onboarding } from "./screens/Onboarding";
import { Desktop } from "./screens/Desktop";
import { useAuth } from "./store/auth";
import { useUi } from "./store/ui";

type Screen = "boot" | "profile-select" | "login" | "onboarding" | "desktop";

export default function App() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);
  const { setLoggedIn, setNeedsSetup } = useAuth();
  const { unlock, lock } = useUi();

  useEffect(() => {
    window.axiom.onForceLock(() => {
      if (screen === "desktop") lock();
    });
  }, [screen]);

  const handleBootComplete = async () => {
    const result = await window.axiom.authNeedsSetup();
    if (result.needsSetup) {
      setNeedsSetup(true);
      setScreen("login");
    } else {
      setScreen("profile-select");
    }
  };

  const handleLoginSuccess = async (id: number) => {
    setLoggedIn(id);
    // Check if this user has seen onboarding
    const seen = await window.axiom.settingsGet("onboarding_done");
    if (!seen) {
      setScreen("onboarding");
    } else {
      setScreen("desktop");
    }
  };

  const handleOnboardingComplete = async () => {
    await window.axiom.settingsSet("onboarding_done", "true");
    setScreen("desktop");
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#040409]">
      <AnimatePresence mode="wait">
        {screen === "boot" && (
          <Boot key="boot" onComplete={handleBootComplete} />
        )}
        {screen === "profile-select" && (
          <ProfileSelect
            key="profile-select"
            onSelect={(id) => {
              setSelectedProfile(id);
              setScreen("login");
            }}
          />
        )}
        {screen === "login" && (
          <Login
            key="login"
            profileId={selectedProfile}
            onSuccess={handleLoginSuccess}
            onBack={() => setScreen("profile-select")}
          />
        )}
        {screen === "onboarding" && (
          <Onboarding key="onboarding" onComplete={handleOnboardingComplete} />
        )}
        {screen === "desktop" && <Desktop key="desktop" />}
      </AnimatePresence>
    </div>
  );
}
