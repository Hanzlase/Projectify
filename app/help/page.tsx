"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  HelpCircle,
  Key,
  AlertCircle,
  Send,
  CheckCircle2,
  User,
  Mail,
  MessageSquare,
  Hash,
  Loader2,
  GraduationCap,
  Shield,
  Briefcase,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type IssueType = "login" | "password" | "account" | "other";

export default function HelpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("login");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const formatRollNumber = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let formatted = "";
    for (let i = 0; i < cleaned.length && i < 7; i++) {
      if (i === 3) formatted += "-";
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/help/submit-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          rollNumber: rollNumber.trim() || null,
          issueType,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.error || "Failed to submit. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueTypes = [
    { value: "login", label: "Login Issue", icon: Shield },
    { value: "password", label: "Password", icon: Key },
    { value: "account", label: "Account", icon: User },
    { value: "other", label: "Other", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900">
      {/* Back Button - Fixed */}
      <Link
        href="/login"
        className="fixed top-6 left-6 z-20 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] hover:shadow-lg transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-5 sticky top-0 z-10"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help Center</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get help with your account and login issues</p>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div className="p-6 lg:p-10">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Login Guides */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 space-y-6"
            >
              {/* Student Login Card */}
              <div
                id="student-login"
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Student Login</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How to access your account
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-[#1a5d1a] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-white font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <code className="text-sm text-[#1a5d1a] dark:text-[#2d7a2d] font-mono">
                          Your Roll Number
                        </code>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Example: 22F-3686
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-[#1a5d1a] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-white font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <code className="text-sm text-[#1a5d1a] dark:text-[#2d7a2d] font-mono">
                          RollNumber + 123
                        </code>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Example: 22F3686123
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Login Card */}
              <div
                id="staff-login"
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Supervisor / Coordinator
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Staff login credentials
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-[#3d8c40] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-white font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <code className="text-sm text-[#1a5d1a] dark:text-[#2d7a2d] font-mono">
                          Your Email Address
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-[#3d8c40] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-white font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <code className="text-sm text-[#1a5d1a] dark:text-[#2d7a2d] font-mono">
                          Username + 123
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="bg-[#1a5d1a] rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Security Tip
                    </h3>
                    <p className="text-sm text-white/80">
                      Change your password after first login for better account
                      security.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              id="contact"
              className="lg:col-span-2"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
                {/* Form Header */}
                <div className="bg-gradient-to-r from-[#1a5d1a] to-[#3d8c40] px-8 py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Contact Your Coordinator
                      </h2>
                      <p className="text-white/80 text-sm">
                        Can&apos;t find what you need? We&apos;re here to help.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Body */}
                <div className="p-8">
                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-[#1a5d1a]" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Request Submitted!
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                        Your message has been sent to the coordinator.
                        They&apos;ll get back to you as soon as possible.
                      </p>
                      <Button
                        onClick={() => {
                          setIsSubmitted(false);
                          setName("");
                          setEmail("");
                          setRollNumber("");
                          setMessage("");
                          setIssueType("login");
                        }}
                        variant="outline"
                        className="border-[#1a5d1a] text-[#1a5d1a] hover:bg-[#d1e7d1] dark:hover:bg-[#1a5d1a]/30"
                      >
                        Submit Another Request
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-4 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{error}</span>
                        </motion.div>
                      )}

                      {/* Name & Email Row */}
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name{" "}
                            <span className="text-[#1a5d1a]">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Enter your name"
                              className="h-12 pl-11 rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 dark:text-white dark:placeholder-gray-400"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Address{" "}
                            <span className="text-[#1a5d1a]">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="h-12 pl-11 rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 dark:text-white dark:placeholder-gray-400"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Roll Number */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Roll Number{" "}
                          <span className="text-gray-400 font-normal">
                            (Students only)
                          </span>
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={rollNumber}
                            onChange={(e) =>
                              setRollNumber(formatRollNumber(e.target.value))
                            }
                            placeholder="22F-3686"
                            className="h-12 pl-11 rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 uppercase focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 dark:text-white dark:placeholder-gray-400"
                          />
                        </div>
                      </div>

                      {/* Issue Type */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Issue Type <span className="text-[#1a5d1a]">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {issueTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                setIssueType(type.value as IssueType)
                              }
                              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                issueType === type.value
                                  ? "border-[#1a5d1a] bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d]"
                                  : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                              }`}
                            >
                              {issueType === type.value && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1a5d1a] rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <type.icon
                                className={`w-5 h-5 ${
                                  issueType === type.value
                                    ? "text-[#1a5d1a] dark:text-[#2d7a2d]"
                                    : "text-gray-400"
                                }`}
                              />
                              <span>{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Describe Your Issue{" "}
                          <span className="text-[#1a5d1a]">*</span>
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Please provide as much detail as possible about your issue..."
                          rows={5}
                          required
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-[#1a5d1a] focus:ring-2 focus:ring-[#1a5d1a]/20 focus:outline-none resize-none text-sm"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-[#1a5d1a] hover:bg-[#145214] text-white font-medium"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending Request...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Submit Request
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
