"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FilePenLine,
  CalendarDays,
  Users,
  IndianRupee,
  BadgeIndianRupee,
  Store,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Globe,
  FileText,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
// import Joyride from "react-joyride";
import { TranslationModal } from "@/components/TranslationModal";
import { useLanguage } from "@/context/LanguageContext";
import NotificationsPopup from "@/components/NotificationsPopup";
import {
  doc,
  onSnapshot,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { NGOABI, SuperAdminABI } from "@/constants/contract";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CryptoPayoutButton } from "@/components/CryptoPayoutButton";

export function SideNav({
  isOpen,
  setIsOpen,
  navConfig,
  type,
  notifications = [],
  notificationsLoading = true,
  onMarkAsRead,
}) {
  const [isMobile, setIsMobile] = useState(false);
  // const [runSidebarTour, setRunSidebarTour] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [ngoProfile, setNgoProfile] = useState(null);
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [showPayoutButton, setShowPayoutButton] = useState(false);

  const pathname = usePathname();
  const navRefs = useRef({});
  const router = useRouter();
  const { language, translations } = useLanguage();

  // Step 1: First fetch the NGO profile and wallet address
  useEffect(() => {
    if (type === "ngo" && auth.currentUser) {
      const unsubscribe = onSnapshot(
        doc(db, "ngo", auth.currentUser.uid),
        (doc) => {
          if (doc.exists()) {
            const profile = doc.data();
            setNgoProfile(profile);

            // Get crypto payment status - check both potential field names
            const isCryptoEnabled =
              profile.donationsData?.isCryptoTransferEnabled ||
              profile.donationsData?.cryptoPaymentEnabled ||
              false;
            setCryptoEnabled(isCryptoEnabled);

            // Get wallet address
            const walletAddr =
              profile.donationsData?.cryptoWalletAddress || null;
            setWalletAddress(walletAddr);

            // Set whether to show payout button
            setShowPayoutButton(isCryptoEnabled && walletAddr);

            console.log("NGO Profile Loaded:", {
              uid: auth.currentUser.uid,
              isCryptoEnabled,
              walletAddress: walletAddr,
              donationsData: profile.donationsData,
            });
          }
        }
      );
      return () => unsubscribe();
    }
  }, [type]);

  // Step 2: Then fetch the contract address using the wallet address
  const {
    data: ngoContractAddress,
    error: ngoContractError,
    isPending: ngoContractPending,
  } = useReadContract({
    address: "0xd4fb2E1C31b146b2EA7521d594Eb7e6eCDF02F93",
    abi: SuperAdminABI,
    functionName: "ngoContracts",
    args: [walletAddress],
    enabled: Boolean(walletAddress && type === "ngo"),
    onSuccess: (data) => {
      console.log("NGO Contract Address fetched:", data);
    },
    onError: (error) => {
      console.error("Error fetching NGO contract address:", error);
    },
  });

  // Step 3: Finally fetch the balance using the contract address
  const {
    data: ngoBalance,
    error: ngoBalanceError,
    isPending: ngoBalancePending,
  } = useReadContract({
    address: ngoContractAddress,
    abi: NGOABI,
    functionName: "getAvailableBalance",
    enabled: Boolean(ngoContractAddress),
    onSuccess: (data) => {
      console.log("NGO Balance fetched:", formatEther(data), "SMC");
    },
    onError: (error) => {
      console.error("Error fetching NGO balance:", error);
    },
  });

  // Use provided notifications if available, otherwise use the locally fetched ones
  const displayNotifications =
    notifications.length > 0 ? notifications : localNotifications;
  const isNotificationsReady =
    notifications.length > 0 || !notificationsLoading;

  // Add notifications listener only if no notifications are provided externally
  useEffect(() => {
    // Only set up our own listener if no notifications are provided via props
    if (notifications.length === 0) {
      const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (user) {
          // Set up notifications listener
          const notificationsRef = doc(db, "notifications", user.uid);
          const unsubscribeNotifications = onSnapshot(
            notificationsRef,
            (doc) => {
              if (doc.exists()) {
                const notificationsData = doc.data()?.notifications || [];
                // Sort notifications by timestamp (newest first)
                const sortedNotifications = [...notificationsData].sort(
                  (a, b) => {
                    const dateA =
                      a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
                    const dateB =
                      b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
                    return dateB - dateA;
                  }
                );
                setLocalNotifications(sortedNotifications);
              } else {
                setLocalNotifications([]);
              }
            }
          );

          return () => unsubscribeNotifications();
        } else {
          setLocalNotifications([]);
        }
      });

      return () => unsubscribeAuth();
    }
  }, [notifications.length]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Listen for the event from DashboardPage to start sidebar tour
    // const handleStartSidebarTour = (event) => {
    //   if (event.detail?.startTour) {
    //     // Ensure sidebar is open before starting the tour
    //     setIsOpen(true);

    //     // Wait a bit for the sidebar to fully expand
    //     setTimeout(() => {
    //       setRunSidebarTour(true);
    //     }, 500);
    //   }
    // };

    // window.addEventListener("startSidebarTour", handleStartSidebarTour);

    return () => {
      window.removeEventListener("resize", checkMobile);
      // window.removeEventListener("startSidebarTour", handleStartSidebarTour);
    };
  }, [setIsOpen]);

  // Also listen for reset tour events when the restart button is clicked
  // useEffect(() => {
  //   const handleResetTour = () => {
  //     // The sidebar tour will be started after the dashboard tour completes
  //     // via the existing startSidebarTour event, so we don't need to do anything here
  //     setRunSidebarTour(false);
  //   };

  //   window.addEventListener("resetTours", handleResetTour);
  //   return () => {
  //     window.removeEventListener("resetTours", handleResetTour);
  //   };
  // }, []);

  // Add custom CSS for tour highlighting when tour is active
  // useEffect(() => {
  //   if (runSidebarTour) {
  //     // Add CSS for tour highlighting
  //     const styleEl = document.createElement("style");
  //     styleEl.id = "sidebar-tour-highlighting-styles";
  //     styleEl.innerHTML = `
  //       .react-joyride__spotlight {
  //         border: 3px solid #1CAC78 !important;
  //         box-shadow: 0 0 15px rgba(28, 172, 120, 0.5) !important;
  //       }

  //       /* Add highlight to specific nav sections during the tour */
  //       .main-nav-section.spotlight-active,
  //       .management-nav-section.spotlight-active,
  //       .finance-nav-section.spotlight-active,
  //       .product-nav-section.spotlight-active,
  //       .bottom-nav-section.spotlight-active {
  //         background-color: rgba(28, 172, 120, 0.1);
  //         border-radius: 8px;
  //         transition: background-color 0.3s ease;
  //       }
  //     `;
  //     document.head.appendChild(styleEl);

  //     return () => {
  //       // Clean up when tour ends
  //       const styleElement = document.getElementById(
  //         "sidebar-tour-highlighting-styles"
  //       );
  //       if (styleElement) {
  //         styleElement.remove();
  //       }
  //     };
  //   }
  // }, [runSidebarTour]);

  const toggleSideNav = () => setIsOpen(!isOpen);

  const signOutHandler = () => {
    signOut(auth).then(() => {
      router.push("/login");
    });
  };

  // Helper function to translate nav item names
  const translateNavItem = (name) => {
    const key = name.toLowerCase().replace(/\s+/g, "_");
    return translations[key] || name;
  };

  // Generate tour steps based on available navigation items
  const generateTourSteps = () => {
    const steps = [
      {
        target: ".nav-container",
        content:
          translations.sidebar_tour_intro ||
          "This sidebar gives you easy access to all the features of your NGO management system.",
        placement: "right",
        disableBeacon: true,
      },
    ];

    // Add steps for main nav items
    if (navConfig.mainNavItems?.length) {
      steps.push({
        target: ".main-nav-section",
        content:
          translations.main_nav_description ||
          "These are your primary navigation options.",
        placement: "right",
      });

      // Add specific steps for important main nav items
      navConfig.mainNavItems.forEach((item) => {
        if (item.name === "Dashboard") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              translations.dashboard_description ||
              "Access your main dashboard to see an overview of all activities and metrics.",
            placement: "right",
          });
        } else if (item.name === "Reports") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              translations.reports_description ||
              "View and generate detailed reports about your NGO's operations and impact.",
            placement: "right",
          });
        }
      });
    }

    // Add steps for management nav items
    if (navConfig.managementNavItems?.length) {
      steps.push({
        target: ".management-nav-section",
        content:
          translations.management_section_description ||
          "This section helps you manage all your NGO's operational activities.",
        placement: "right",
      });

      // Add specific steps for important management nav items
      navConfig.managementNavItems.forEach((item) => {
        if (item.name === "Activities") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              translations.activities_description ||
              "Create and manage your NGO's activities, events, and campaigns.",
            placement: "right",
          });
        } else if (item.name === "Members") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              translations.members_description ||
              "Manage your team members, volunteers, and their permissions.",
            placement: "right",
          });
        }
      });
    }

    // Add steps for finance nav items
    if (navConfig.financeNavItems?.length) {
      steps.push({
        target: ".finance-nav-section",
        content:
          translations.finance_section_description ||
          "Track all financial aspects of your NGO in this section.",
        placement: "right",
      });

      // Add specific steps for important finance nav items
      navConfig.financeNavItems.forEach((item) => {
        if (item.name === "Donations") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              translations.donations_description ||
              "Track and manage all donations received by your NGO.",
            placement: "right",
          });
        }
      });
    }

    // Add steps for product nav items
    if (navConfig.ProductNavItems?.length) {
      steps.push({
        target: ".product-nav-section",
        content:
          translations.product_section_description ||
          "Manage your NGO's inventory and products in this section.",
        placement: "right",
      });

      // Add specific steps for important product nav items
      navConfig.ProductNavItems.forEach((item) => {
        if (item.name === "Products" || item.name === "Inventory") {
          steps.push({
            target: `#nav-${item.name.toLowerCase()}`,
            content:
              item.name === "Products"
                ? translations.products_description ||
                  "Create and manage products your NGO offers or distributes."
                : translations.inventory_description ||
                  "Keep track of your NGO's inventory and supplies.",
            placement: "right",
          });
        }
      });
    }

    // Add steps for bottom nav items
    if (navConfig.bottomNavItems?.length) {
      steps.push({
        target: ".bottom-nav-section",
        content:
          translations.bottom_nav_description ||
          "Access important account and system settings here.",
        placement: "right",
      });
    }

    // Add step for the logout button
    steps.push({
      target: "#logout-button",
      content:
        translations.logout_description ||
        "Click here to safely log out of your account.",
      placement: "right",
    });

    // Add step for the translation button
    steps.push({
      target: "#translate-button",
      content:
        translations.translate_description ||
        "Click here to change the language of the platform.",
      placement: "right",
    });

    return steps;
  };

  const renderNavItems = (items, sectionClass) => (
    <ul className={`space-y-2 ${sectionClass}`}>
      {items?.map((item) => {
        const navId = `nav-${item.name.toLowerCase()}`;
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              id={navId}
              className={cn(
                "flex items-center rounded-lg p-2 text-gray-700 transition-colors duration-200",
                pathname === item.href
                  ? "bg-[#1CAC78] text-white"
                  : "hover:bg-[#1CAC78] hover:bg-opacity-10 hover:text-[#1CAC78]",
                !isOpen && "justify-center"
              )}
              onClick={() => {
                if (isMobile) setIsOpen(false);
              }}
              ref={(el) => {
                navRefs.current[navId] = el;
              }}
            >
              <item.icon className="h-6 w-6" />
              {isOpen && (
                <span className="ml-3">{translateNavItem(item.name)}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  // Handle tour callback
  const handleTourCallback = (data) => {
    const { status, index, type } = data;

    // Handle adding active class to the current section being highlighted
    if (type === "step:before") {
      // Clear any existing active highlights
      document.querySelectorAll(".spotlight-active").forEach((el) => {
        el.classList.remove("spotlight-active");
      });

      // Get the current step target
      const currentStep = generateTourSteps()[index];
      if (currentStep && currentStep.target) {
        const targetSelector = currentStep.target;
        // Check if it's one of our section targets
        if (
          [
            ".main-nav-section",
            ".management-nav-section",
            ".finance-nav-section",
            ".product-nav-section",
            ".bottom-nav-section",
          ].includes(targetSelector)
        ) {
          const targetEl = document.querySelector(targetSelector);
          if (targetEl) {
            targetEl.classList.add("spotlight-active");
          }
        }
      }
    }

    if (status === "finished" || status === "skipped") {
      // Save that the tour has been completed
      localStorage.setItem("hasCompletedFullTour", "true");

      // Remove any active highlights
      document.querySelectorAll(".spotlight-active").forEach((el) => {
        el.classList.remove("spotlight-active");
      });
    }
  };

  // Handle notification read updates from the NotificationsPopup
  const handleMarkAsRead = (index, markAllRead = false) => {
    if (markAllRead) {
      // If notifications are provided via props, we need to call parent update
      // Otherwise we just update local state
      if (notifications.length > 0) {
        // Check if onMarkAsRead exists before calling it
        if (typeof onMarkAsRead === "function") {
          onMarkAsRead(null, true);
        }
      } else {
        setLocalNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
      }
    } else if (index !== null && index >= 0) {
      // If notifications are provided via props, we need to call parent update
      // Otherwise we just update local state
      if (notifications.length > 0) {
        // Check if onMarkAsRead exists before calling it
        if (typeof onMarkAsRead === "function") {
          onMarkAsRead(index);
        }
      } else if (index < localNotifications.length) {
        setLocalNotifications((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], read: true };
          return updated;
        });
      }
    }
  };

  return (
    <>
      <motion.nav
        className={cn(
          "nav-container fixed left-0 top-0 z-50 h-full bg-white shadow-lg transition-all duration-300",
          isOpen ? "w-64" : isMobile ? "w-0" : "w-16"
        )}
        initial={false}
        animate={{ width: isOpen ? 256 : isMobile ? 0 : 64 }}
      >
        <div className="flex h-full flex-col p-4">
          <div
            className={cn(
              "mb-8 flex items-center",
              isOpen ? "justify-between" : "justify-center"
            )}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              {isOpen && (
                <span className="ml-2 text-xl font-bold">
                  {translations.ngo_connect || "SMILE-SHARE"}
                </span>
              )}
            </div>
            {isMobile && isOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSideNav}
                className="md:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="main-nav-section">
              {renderNavItems(navConfig.mainNavItems, "main-nav-items")}
            </div>

            {type === "ngo" && isOpen && (
              <div className="my-4 border-t border-gray-200" />
            )}

            {type === "ngo" && (
              <div className="management-nav-section">
                {renderNavItems(
                  navConfig.managementNavItems,
                  "management-nav-items"
                )}
              </div>
            )}

            {type === "ngo" && isOpen && (
              <div className="my-4 border-t border-gray-200" />
            )}

            {type === "ngo" && (
              <div className="finance-nav-section">
                {renderNavItems(navConfig.financeNavItems, "finance-nav-items")}
              </div>
            )}

            {type === "ngo" && isOpen && (
              <div className="my-4 border-t border-gray-200" />
            )}

            {type === "ngo" && (
              <div className="product-nav-section">
                {renderNavItems(navConfig.ProductNavItems, "product-nav-items")}
              </div>
            )}
          </div>

          {/* Chat with PDF Button */}
          {type === "ngo" && (
            <div className="pdf-chat-section">
              {isOpen && <div className="my-4 border-t border-gray-200" />}
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dashboard/ngo/chat-report"
                    id="nav-chat-report"
                    className={cn(
                      "flex items-center rounded-lg p-2 text-gray-700 transition-colors duration-200",
                      pathname === "/dashboard/ngo/chat-report"
                        ? "bg-[#1CAC78] text-white"
                        : "hover:bg-[#1CAC78] hover:bg-opacity-10 hover:text-[#1CAC78]",
                      !isOpen && "justify-center"
                    )}
                    onClick={() => {
                      if (isMobile) setIsOpen(false);
                    }}
                  >
                    <FileText className="h-6 w-6" />
                    {isOpen && (
                      <span className="ml-3">
                        {translations.chat_report || "Chat with PDF"}
                      </span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div className="mt-auto bottom-nav-section">
            {isOpen && <div className="my-4 border-t border-gray-200" />}
            <div className="py-2">
              {/* Crypto Balance Display - Only check if user is NGO and crypto is enabled */}
              {type === "ngo" && cryptoEnabled && (
                <div
                  className={cn(
                    "flex items-center rounded-lg p-2 text-gray-700 mb-2",
                    !isOpen && "justify-center",
                    "bg-[#1CAC78] bg-opacity-10"
                  )}
                >
                  <Wallet className="h-6 w-6 text-[#1CAC78]" />
                  {isOpen && (
                    <div className="ml-3 flex-1">
                      <div className="text-xs text-gray-600">
                        Available Balance
                      </div>
                      <div className="font-medium flex items-center justify-between">
                        <span>
                          {ngoBalance ? formatEther(ngoBalance) : "0"} SMC
                        </span>
                        {showPayoutButton && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2"
                            onClick={() =>
                              router.push("/dashboard/ngo/finances/crypto")
                            }
                            title="Request Payout"
                          >
                            <ArrowUpRight className="h-4 w-4 text-[#1CAC78]" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Popup */}
              {auth.currentUser && isNotificationsReady && (
                <NotificationsPopup
                  notifications={displayNotifications}
                  onMarkAsRead={handleMarkAsRead}
                />
              )}

              {renderNavItems(navConfig.bottomNavItems, "bottom-nav-items")}

              {/* Translate Button */}
              <button
                id="translate-button"
                className={cn(
                  "flex items-center rounded-lg p-2 text-gray-700 transition-colors duration-200 w-full",
                  "hover:bg-[#1CAC78] hover:bg-opacity-10 hover:text-[#1CAC78]",
                  !isOpen && "justify-center"
                )}
                variant="none"
                onClick={() => setShowTranslationModal(true)}
              >
                <Globe className="h-6 w-6" />
                {isOpen && (
                  <span className="ml-3">
                    {translations.translate || "Translate"}
                  </span>
                )}
              </button>

              <button
                id="logout-button"
                className={cn(
                  "flex items-center rounded-lg p-2 text-gray-700 transition-colors duration-200 w-full",
                  pathname === "/logout"
                    ? "bg-[#1CAC78] text-white"
                    : "hover:bg-[#1CAC78] hover:bg-opacity-10 hover:text-[#1CAC78]",
                  !isOpen && "justify-center"
                )}
                variant="none"
                onClick={signOutHandler}
              >
                <LogOut className="h-6 w-6" />
                {isOpen && (
                  <span className="ml-3">
                    {translations.logout || "Logout"}
                  </span>
                )}
              </button>
            </div>
            <button
              id="toggle-nav-button"
              className={cn(
                "flex items-center rounded-lg p-2 text-gray-700 transition-colors duration-200 w-full hover:bg-[#1CAC78] hover:bg-opacity-10 hover:text-[#1CAC78]",
                !isOpen && "justify-center"
              )}
              variant="none"
              onClick={toggleSideNav}
            >
              {isOpen ? (
                <>
                  <ChevronLeft className="h-6 w-6" />
                  <span className="ml-3">
                    {translations.collapse || "Collapse"}
                  </span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-6 w-6" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
      />

      {/* Sidebar Tour */}
      {/* <Joyride
        steps={generateTourSteps()}
        run={runSidebarTour}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableOverlayClose
        spotlightClicks
        styles={{
          options: {
            zIndex: 10000,
            arrowColor: "#1CAC78",
            backgroundColor: "#fff",
            overlayColor: "rgba(0, 0, 0, 0.5)",
            primaryColor: "#1CAC78",
            textColor: "#333",
            spotlightPadding: 8, // Increased padding
          },
          buttonNext: {
            backgroundColor: "#1CAC78",
          },
          buttonBack: {
            color: "#1CAC78",
          },
          spotlight: {
            backgroundColor: "transparent",
          },
          tooltip: {
            fontSize: "14px",
            padding: "15px",
            boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
          },
        }}
        callback={handleTourCallback}
      /> */}
    </>
  );
}
