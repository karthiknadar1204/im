'use client'

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect } from "react";
import { createUser } from "./actions/user";
import PricingCards from "@/components/PricingCards";
import { ArrowRight, Sparkles, Zap, Crown, CheckCircle } from "lucide-react";

export default function Home() {
  const {user}=useUser()

  useEffect(() => {
    const createUserInDb = async () => {
      if (user && user.fullName && user.emailAddresses?.[0]?.emailAddress && user.imageUrl && user.id) {
        try {
          const result = await createUser(
            user.fullName,
            user.emailAddresses[0].emailAddress,
            user.imageUrl,
            user.id
          )
          console.log('User creation result:', result)
        } catch (error) {
          console.error('Error creating user:', error)
        }
      }
    }

    createUserInDb()
  }, [user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              AI-Powered Image
              <span className="text-blue-600 dark:text-blue-400"> Generation</span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Create stunning, high-quality images with our advanced AI technology. 
              Train custom models and generate unlimited creative content for your projects.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#pricing"
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold rounded-lg transition-colors duration-200"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Creators
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to bring your creative vision to life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI Image Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate high-quality images from text descriptions using state-of-the-art AI models.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Custom Model Training
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Train your own AI models on your unique style and create personalized content.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Commercial Rights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Use your generated images commercially with full rights and licensing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <PricingCards />
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of creators who are already using our AI platform to bring their ideas to life.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-lg transition-colors duration-200"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">AI Image Generator</h3>
              <p className="text-gray-400">
                Create stunning images with the power of artificial intelligence.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AI Image Generator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
