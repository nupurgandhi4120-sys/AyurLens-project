import React, { useMemo, useState } from 'react';
import { Bot, Send, UserRound } from 'lucide-react';
import { plantDatabase } from '../data/plantdatabase';
import { askQuestion } from '../services/aiservise';

const starterMessages = [
  {
    role: 'assistant',
    text: 'Ask about a plant, compound, use, AYUSH system, precaution, or any general herbal wellness question.',
  },
];

const getLibraryAnswer = (question) => {
  const normalizedQuestion = question.toLowerCase();
  const matches = plantDatabase.filter((plant) => {
    const searchableText = [
      plant.commonName,
      plant.scientificName,
      plant.family,
      plant.description,
      ...plant.ayushSystems,
      ...plant.uses,
      ...plant.precautions,
      ...plant.activeCompounds,
      ...plant.similarPlants,
      ...(plant.tastes || []),
      ...(plant.properties || []),
      ...(plant.plantParts || []),
    ].join(' ').toLowerCase();

    return searchableText.includes(normalizedQuestion) ||
      normalizedQuestion.includes(plant.commonName.toLowerCase().split(' ')[0]);
  });

  const directMatch = matches[0];

  if (!directMatch) {
    return null;
  }

  if (normalizedQuestion.includes('precaution') || normalizedQuestion.includes('safe')) {
    return `${directMatch.commonName} precautions: ${directMatch.precautions.join(' ')} This is educational only, not medical advice.`;
  }

  if (normalizedQuestion.includes('compound') || normalizedQuestion.includes('chemical')) {
    return `${directMatch.commonName} active compounds include ${directMatch.activeCompounds.join(', ')}.`;
  }

  if (normalizedQuestion.includes('system') || normalizedQuestion.includes('ayush')) {
    return `${directMatch.commonName} appears in these AYUSH systems: ${directMatch.ayushSystems.join(', ')}.`;
  }

  if (normalizedQuestion.includes('use') || normalizedQuestion.includes('used') || normalizedQuestion.includes('benefit')) {
    return `${directMatch.commonName} is known for: ${directMatch.uses.join(', ')}.`;
  }

  return `${directMatch.commonName} (${directMatch.scientificName}) is known for: ${directMatch.uses.join(', ')}. Key compounds: ${directMatch.activeCompounds.join(', ')}. Precaution: ${directMatch.precautions[0]}.`;
};

export default function Assistant() {
  const [messages, setMessages] = useState(starterMessages);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = useMemo(() => [
    'What is Tulsi used for?',
    'Neem precautions',
    'Turmeric compounds',
    'Which systems mention Aloe Vera?',
    'How do I care for a houseplant?',
    'What are the benefits of herbal tea?',
  ], []);

  const submitQuestion = async (event, selectedQuestion = question) => {
    event?.preventDefault();
    const trimmedQuestion = selectedQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'user', text: trimmedQuestion },
    ]);
    setQuestion('');

    const libraryAnswer = getLibraryAnswer(trimmedQuestion);
    if (libraryAnswer) {
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', text: libraryAnswer },
      ]);
      return;
    }

    setIsLoading(true);
    const aiAnswer = await askQuestion(trimmedQuestion);
    setIsLoading(false);

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'assistant', text: aiAnswer },
    ]);
  };

  return (
    <section className="assistant-shell">
      <div className="assistant-messages">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const Icon = isUser ? UserRound : Bot;

          return (
            <div className={`message-row ${isUser ? 'message-row-user' : ''}`} key={`${message.role}-${index}`}>
              <div className="message-icon">
                <Icon className="w-4 h-4" />
              </div>
              <div className={`message-bubble ${isUser ? 'message-bubble-user' : ''}`}>
                {message.text}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="message-row">
            <div className="message-icon">
              <Bot className="w-4 h-4" />
            </div>
            <div className="message-bubble">Thinking...</div>
          </div>
        )}
      </div>

      <div className="suggestion-row">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            onClick={(event) => submitQuestion(event, suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form className="assistant-form" onSubmit={submitQuestion}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about a plant or any herbal wellness topic..."
          disabled={isLoading}
        />
        <button type="submit" aria-label="Send question" disabled={isLoading}>
          <Send className="w-5 h-5" />
        </button>
      </form>
    </section>
  );
}