import React from 'react';

const SupportPage: React.FC = () => {
  const referralImg = `data:image/svg+xml;utf8,
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='200' viewBox='0 0 600 200'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='0'>
        <stop offset='0%' stop-color='%23b58900'/>
        <stop offset='100%' stop-color='%23ffcc66'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='%2314141a'/>
    <rect x='10' y='10' width='580' height='180' rx='14' fill='url(%23g)' opacity='0.15' stroke='%23ffcc66' stroke-opacity='0.3'/>
    <text x='300' y='85' text-anchor='middle' font-family='Inter, Arial' font-size='36' fill='%23ffcc66'>Win5x</text>
    <text x='300' y='130' text-anchor='middle' font-family='Inter, Arial' font-size='18' fill='%23e5e7eb'>Invite friends and get rewards</text>
  </svg>`;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-gray-900/80 border border-gold-500/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gold-500/20 bg-gradient-to-r from-gray-900 to-gray-800">
          <h3 className="text-xl font-bold text-gold-300">Win5x Customer Service</h3>
          <p className="text-gray-400 text-sm">We respond quickly to deposit/withdrawal queries</p>
        </div>
        <div className="p-5 space-y-4">
          <a
            href="https://mail.google.com/mail/u/0/#inbox?compose=new"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gold-500/30 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
                <span className="text-gold-300 font-bold">@</span>
              </div>
              <div className="text-left">
                <div className="text-gold-300 font-semibold">Email Support</div>
                <div className="text-xs text-gray-400">winein5x@gmail.com</div>
              </div>
            </div>
            <span className="text-gold-300">›</span>
          </a>

          <a
            href="https://t.me/"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gold-500/30 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
                <span className="text-gold-300 font-bold">Tg</span>
              </div>
              <div className="text-left">
                <div className="text-gold-300 font-semibold">Telegram</div>
                <div className="text-xs text-gray-400">Chat with our team</div>
              </div>
            </div>
            <span className="text-gold-300">›</span>
          </a>

          <div className="text-sm text-gray-300 leading-relaxed bg-gray-900/60 border border-gold-500/20 rounded-lg p-4">
            For quicker handling: for deposits use the <span className="text-gold-300 font-semibold">Deposit Not Received</span> option, and for withdrawals use the <span className="text-gold-300 font-semibold">Withdrawal Not Received</span> option in your app.
          </div>

          {/* Live chat removed */}

          <div className="rounded-lg overflow-hidden border border-gold-500/20">
            <img src={referralImg} alt="Win5x referral" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;


