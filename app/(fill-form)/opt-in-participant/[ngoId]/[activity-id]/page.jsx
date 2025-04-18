"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const ParticipantRegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);

  const router = useRouter();
  const { ngoId, "activity-id": activityId } = useParams();

  // Check auth and fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("Please login to register as a participant");
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            experience: "",
          });

          // Check if already applied
          const participations = userData.participations || [];
          setHasAlreadyApplied(
            participations.some((p) => p.activityId === activityId)
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityId]);

  // Real-time activity status listener
  useEffect(() => {
    if (!activityId) return;

    const activityRef = doc(db, "activities", activityId);
    const unsubscribe = onSnapshot(activityRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setActivityData(data);
        setIsAccepting(data.participationFormStatus === "accepting");
        setIsFull(
          (data.noOfParticipants || 0) >= (data.acceptingParticipants || 0)
        );
      }
    });

    return () => unsubscribe();
  }, [activityId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("Please login to register");
      return;
    }

    if (hasAlreadyApplied) {
      setError("You have already registered for this activity");
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const timestamp = new Date().toISOString();
      const sId = activityId + userId;
      // Add to participants subcollection
      await setDoc(doc(db, "activities", activityId, "participants", userId), {
        ...formData,
        userId,
        submittedAt: timestamp,
        // status: "pending",
        attendance: false,
        sId,
      });

      // Update user's document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        participations: arrayUnion({
          activityId,
          ngoId,
          appliedAt: timestamp,
          // status: "pending",
          attendance: false,
          sId,
        }),
      });

      // Update participant count
      await updateDoc(doc(db, "activities", activityId), {
        noOfParticipants: (activityData.noOfParticipants || 0) + 1,
      });

      setSuccess(true);
      router.push("/dashboard/user/activities");
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Failed to submit registration");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (hasAlreadyApplied) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-yellow-600">
            Already Registered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">
            You have already registered as a participant for this activity.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!isAccepting || isFull) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Registration Closed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">
            Volunteer registration is currently closed.
            {/* Volunteer registration is currently closed. Please check back later. */}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="p-8 mt-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Participant Registration</CardTitle>
          <CardDescription>
            Please fill in your details to register as a participant
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full">
              Register as Participant
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AlertDialog open={!!error} onOpenChange={() => setError("")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setError("")}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={success} onOpenChange={() => setSuccess(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Success!</AlertDialogTitle>
            <AlertDialogDescription>
              Your participant registration has been submitted successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccess(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParticipantRegistrationForm;
