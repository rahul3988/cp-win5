import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Info, Shield, Award, Coins, Star } from 'lucide-react';

const RulesPage: React.FC = () => {

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="h-20 w-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Game Rules</h1>
          <p className="text-gray-400 text-lg">Learn how to play Win5x responsibly and effectively</p>
        </div>


        {/* Wallet System */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Coins className="h-5 w-5 text-gold-400" />
              Wallet System
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Betting Wallet</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Minimum ₹10 required to place any bet</li>
                  <li>• Used for all betting activities</li>
                  <li>• Cannot bet if balance is below ₹10</li>
                  <li>• Winnings are credited to Gaming Wallet</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Gaming Wallet</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Receives all winnings and bonuses</li>
                  <li>• Can be used for betting (combined mode)</li>
                  <li>• Used for withdrawals</li>
                  <li>• Attendance bonuses credited here</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance System */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Star className="h-5 w-5 text-gold-400" />
              Daily Attendance Rewards
            </h3>
          </div>
          <div className="card-content">
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h4 className="text-lg font-semibold text-white mb-3">Requirements</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Must have deposited at least ₹100 (one-time requirement)</li>
                <li>• Must place at least ₹10 in bets today</li>
                <li>• Can only claim once per day</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              {[5, 10, 15, 20, 30, 40, 60].map((amount, index) => (
                <div key={index} className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-gold-400">Day {index + 1}</div>
                  <div className="text-sm text-gray-300">₹{amount}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3 text-center">
              After Day 7, the cycle resets to Day 1
            </p>
          </div>
        </div>

        {/* Fair Play & Security */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Shield className="h-5 w-5 text-gold-400" />
              Fair Play & Security
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Account Rules</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• One account per person only</li>
                  <li>• Must be 18+ years old</li>
                  <li>• Suspicious activity leads to account review</li>
                  <li>• All outcomes are server-verified</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Dispute Resolution</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• All rounds are logged and auditable</li>
                  <li>• Contact support for any disputes</li>
                  <li>• Response time: within 24 hours</li>
                  <li>• Fair and transparent resolution process</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Responsible Gaming */}
        <div className="card bg-gradient-to-r from-red-900 to-red-800">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2 text-white">
              <Award className="h-5 w-5 text-red-200" />
              Responsible Gaming
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Set Limits</h4>
                <ul className="space-y-2 text-red-100">
                  <li>• Set a daily/weekly budget and stick to it</li>
                  <li>• Never chase losses with bigger bets</li>
                  <li>• Take regular breaks from playing</li>
                  <li>• Use the betting history to track patterns</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Warning Signs</h4>
                <ul className="space-y-2 text-red-100">
                  <li>• Spending more than you can afford</li>
                  <li>• Playing to win back losses</li>
                  <li>• Neglecting other activities</li>
                  <li>• Feeling anxious when not playing</li>
                </ul>
              </div>
            </div>
            <div className="bg-red-800 p-4 rounded-lg text-center">
              <p className="text-white font-semibold">
                If you feel you have a gambling problem, please seek help immediately.
              </p>
              <p className="text-red-200 text-sm mt-2">
                Contact: <a href="mailto:winein5x@gmail.com" className="underline">winein5x@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RulesPage;