"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Calendar,
  MapPin,
  Star,
  Clock,
  ArrowRightIcon,
  EyeIcon,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import Autosuggest from "react-autosuggest";
import { db } from "@/lib/firebase"; // Make sure you have this import
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationModal } from "@/components/TranslationModal";

export default function SearchActivitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [category, setCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("upcoming"); // Set default to "upcoming"
  const [location, setLocation] = useState("");
  const [ngoRating, setNgoRating] = useState([4]);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ngoDataMap, setNgoDataMap] = useState({});
  const [allActivities, setAllActivities] = useState([]); // Store all activities separately
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { language, translations } = useLanguage();

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Save recent searches to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Fetch NGO data for a set of NGO IDs
  const fetchNgoData = async (ngoIds) => {
    const uniqueNgoIds = [...new Set(ngoIds.filter((id) => id))];
    const ngoMap = {};

    try {
      await Promise.all(
        uniqueNgoIds.map(async (ngoId) => {
          const ngoDocRef = doc(db, "ngo", ngoId);
          const ngoDocSnap = await getDoc(ngoDocRef);

          if (ngoDocSnap.exists()) {
            ngoMap[ngoId] = ngoDocSnap.data();
          } else {
            ngoMap[ngoId] = { ngoName: "Unknown NGO" };
          }
        })
      );

      setNgoDataMap(ngoMap);
    } catch (error) {
      console.error("Error fetching NGO data:", error);
    }
  };

  // Fetch activities from Firestore
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const activitiesRef = collection(db, "activities");
        const querySnapshot = await getDocs(activitiesRef);
        const activitiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Store all activities
        setAllActivities(activitiesData);

        // Filter for upcoming activities by default
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const upcomingActivities = activitiesData.filter((activity) => {
          const eventDate = new Date(activity.eventDate);
          return eventDate >= today;
        });

        setActivities(upcomingActivities);
        setFilteredActivities(upcomingActivities);

        // Extract all NGO IDs from activities
        const ngoIds = activitiesData.map((activity) => activity.ngoId);
        await fetchNgoData(ngoIds);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Filter activities based on search and filter criteria
  useEffect(() => {
    let baseActivities = allActivities;

    // First apply date filtering to determine the base set of activities
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === "upcoming") {
      baseActivities = allActivities.filter((activity) => {
        const eventDate = new Date(activity.eventDate);
        return eventDate >= today;
      });
    } else if (dateFilter === "ongoing") {
      baseActivities = allActivities.filter((activity) => {
        const eventDate = new Date(activity.eventDate);
        return eventDate.toDateString() === today.toDateString();
      });
    } else if (dateFilter === "past") {
      baseActivities = allActivities.filter((activity) => {
        const eventDate = new Date(activity.eventDate);
        return eventDate < today;
      });
    }

    // Set the base activities that match the date filter
    setActivities(baseActivities);

    let results = baseActivities;

    // Apply search filter
    if (searchQuery) {
      results = results.filter((activity) => {
        const ngoName =
          (activity.ngoId && ngoDataMap[activity.ngoId]?.ngoName) || "";

        return (
          activity.eventName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ngoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.shortDescription
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
        );
      });
    }

    // Apply category filter
    if (category) {
      results = results.filter(
        (activity) =>
          activity.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply location filter
    if (location) {
      results = results.filter(
        (activity) =>
          activity.location?.address?.toLowerCase() === location.toLowerCase()
      );
    }

    // Apply NGO rating filter
    if (ngoRating[0] > 0) {
      results = results.filter((activity) => {
        const ngoData = activity.ngoId && ngoDataMap[activity.ngoId];
        const rating = ngoData?.rating || activity.ngoRating || 0;
        return rating >= ngoRating[0];
      });
    }

    setFilteredActivities(results);
  }, [
    searchQuery,
    category,
    dateFilter,
    location,
    ngoRating,
    allActivities,
    ngoDataMap,
  ]);

  // Autosuggest functions
  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : activities
          .filter((activity) =>
            activity.eventName?.toLowerCase().includes(inputValue)
          )
          .slice(0, 5);
  };

  const getSuggestionValue = (suggestion) => suggestion.eventName || "";

  const renderSuggestion = (suggestion) => (
    <div className="p-2 hover:bg-gray-100 cursor-pointer">
      {suggestion.eventName}
    </div>
  );

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const onSuggestionSelected = (event, { suggestion }) => {
    setSearchQuery(suggestion.eventName || "");

    // Add to recent searches
    const search = suggestion.eventName || "";
    if (search && !recentSearches.includes(search)) {
      const newSearches = [search, ...recentSearches].slice(0, 5);
      setRecentSearches(newSearches);
    }
  };

  const handleSearch = () => {
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      const newSearches = [searchQuery, ...recentSearches].slice(0, 5);
      setRecentSearches(newSearches);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return translations.no_date || "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get NGO name from NGO ID
  const getNgoName = (ngoId) => {
    if (!ngoId) return translations.unknown_ngo || "Unknown NGO";
    const ngoData = ngoDataMap[ngoId];
    return ngoData?.ngoName || translations.unknown_ngo || "Unknown NGO";
  };

  const inputProps = {
    placeholder:
      translations.search_placeholder || "Search NGOs, events, or causes...",
    value: searchQuery,
    onChange: (_, { newValue }) => setSearchQuery(newValue),
    className: "flex-grow p-2 border rounded-md w-full",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 space-y-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {translations.search_activities || "Search Activities"}
        </h1>
        <Button
          onClick={() => setShowTranslationModal(true)}
          className="flex items-center gap-2 bg-[#1CAC78] hover:bg-[#158f63]"
        >
          <Globe className="h-4 w-4" />
          <span>{translations.translate || "Translate"}</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {translations.search_and_filters || "Search and Filters"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 relative">
            <div className="w-full">
              <div className="flex items-center">
                <Search className="w-5 h-5 text-gray-500 absolute left-3 z-10" />
                <Autosuggest
                  suggestions={suggestions}
                  onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                  onSuggestionsClearRequested={onSuggestionsClearRequested}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  inputProps={{
                    ...inputProps,
                    className: inputProps.className + " pl-10",
                  }}
                  onSuggestionSelected={onSuggestionSelected}
                  theme={{
                    container: "w-full",
                    suggestionsContainer:
                      "absolute z-10 w-full bg-white shadow-lg rounded-md mt-1",
                    suggestionsList: "list-none p-0 m-0",
                  }}
                />
              </div>
              <Button
                onClick={handleSearch}
                className="absolute right-2 top-1 bg-[#1CAC78] hover:bg-[#158f63]"
              >
                {translations.search_button || "Search"}
              </Button>
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div className="mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {translations.recent_searches || "Recent Searches"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500"
                >
                  {translations.clear || "Clear"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(search)}
                    className="text-xs"
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Filters would go here - commented out in your original code */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {translations.all_upcoming_activities || "All Upcoming Activities"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>
                {translations.loading_activities || "Loading activities..."}
              </p>
            </div>
          ) : activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold">
                    {activity.eventName ||
                      translations.unnamed_activity ||
                      "Unnamed Activity"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getNgoName(activity.ngoId)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500 mt-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(activity.eventDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>
                        {activity.location?.address ||
                          translations.location_tbd ||
                          "Location TBD"}
                      </span>
                    </div>
                  </div>
                  {activity.shortDescription && (
                    <p className="text-sm mt-2 line-clamp-2">
                      {activity.shortDescription}
                    </p>
                  )}
                  <div className="mt-3 flex justify-between items-center">
                    {activity.ngoId && ngoDataMap[activity.ngoId]?.rating && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-sm">
                          {ngoDataMap[activity.ngoId].rating}
                        </span>
                      </div>
                    )}
                    <Link
                      size="sm"
                      className="bg-[#1CAC78] hover:bg-[#158f63] p-2 rounded-lg text-white"
                      href={`/dashboard/user/activities/${activity.id}`}
                    >
                      {translations.view_activity || "View Activity"}{" "}
                      <EyeIcon className="inline ml-1" />
                    </Link>
                    <Link
                      size="sm"
                      className="bg-[#1CAC78] hover:bg-[#158f63] p-2 rounded-lg text-white"
                      href={`/opt-in-participant/${activity.ngoId}/${activity.id}`}
                    >
                      {translations.register || "Register"}{" "}
                      <ArrowRightIcon className="inline ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p>
                {translations.no_activities_found ||
                  "No activities available at the moment. Check back later!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
      />
    </motion.div>
  );
}
