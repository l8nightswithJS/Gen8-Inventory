import React from "react";
import logog8 from '../assets/logog8.png';


export default function Footer() {
    return (
        <section className="bg-gray-50 border-t py-8">
        {/* … your existing footer code … */}
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={logog8}
              alt="Warehouse icon"
              className="w-20 h-20 flex-shrink-0"
            />
            <blockquote className="italic text-gray-700">
              <p>“Inventory accuracy is the hallmark of operational excellence.”</p>
              <cite className="block mt-2 not-italic text-sm font-semibold text-gray-800">
                — Gener8 Team
              </cite>
            </blockquote>
          </div>
          <div className="text-center md:text-right">
            <a
              href="mailto:feedback@gener8.net"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md shadow transition"
            >
              Send Feedback
            </a>
          </div>
        </div>
      </section>
    );
}