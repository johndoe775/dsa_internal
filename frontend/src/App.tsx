
import React from 'react'
import ChatbotUI from './ChatbotUI'

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <div className="title">Data Trust Chatbot</div>
        
      </header>
      <main className="main">
        <ChatbotUI policies={["Definitions & Concepts",
            "Policies & Compliance",
            "Data Access & Security",
            "Roles & Responsibilities",
            "Data Quality & Usage",
            "Classification & Tagging",
            "Security & Compliance",
            "Contextual Examples"]} />
      </main>
      <footer className="footer">© {new Date().getFullYear()} Data Trust</footer>
    </div>
  )
}
