import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Boot } from "./screens/Boot";
import { ProfileSelect } from "./screens/ProfileSelect";
import { Login } from "./screens/Login";
import { Desktop } from "./screens/Desktop";
import { useAuth } from "./store/auth";
import { useUi } from "./store/ui";

type Screen = "boot" | "profile-select" | "login" | "desktop";

export default function App() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);
  const { setLoggedIn, setNeedsSetup } = useAuth();
  const { unlock } = useUi();

  useEffect(() => {
    window.axiom.onForceLock(() => {
      if (screen === "desktop") unlock(); // triggers lock overlay
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
            onSuccess={(id) => {
              setLoggedIn(id);
              setScreen("desktop");
            }}
            onBack={() => setScreen("profile-select")}
          />
        )}
        {screen === "desktop" && <Desktop key="desktop" />}
      </AnimatePresence>
    </div>
  );
}
