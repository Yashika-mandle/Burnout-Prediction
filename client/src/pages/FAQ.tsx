import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";

export default function FAQ() {
  const faqs = [
    {
      question: "What is student burnout?",
      answer:
        "Student burnout is a state of physical, emotional, and mental exhaustion caused by prolonged stress related to academic work. It's characterized by fatigue, reduced motivation, decreased academic performance, and mental health issues.",
    },
    {
      question: "How does the AI prediction model work?",
      answer:
        "Our model uses a Random Forest regressor trained on student-like features. It analyzes factors including sleep, study time, screen time, mental health score, exercise, caffeine intake, and more to estimate burnout risk.",
    },
    {
      question: "What does my burnout score mean?",
      answer:
        "Your burnout score ranges from 0-10. Low (0-3.5) means you're maintaining good balance, Medium (3.5-6.5) indicates warning signs that need attention, and High (6.5-10) suggests urgent action is needed.",
    },
    {
      question: "How often should I take the assessment?",
      answer:
        "We recommend taking the assessment weekly to track your burnout levels over time. Regular assessments help you identify patterns and see if your lifestyle changes are making a positive impact.",
    },
    {
      question: "Are my personal data and results kept private?",
      answer:
        "Your account and history are stored by the demo backend for your username. Use a strong password and run the app locally for coursework demos.",
    },
    {
      question: "What should I do if I get a 'High' burnout score?",
      answer:
        "If you receive a high score: reach out to a mental health professional or counselor, follow the personalized suggestions, reduce overload where possible, and talk to someone you trust.",
    },
    {
      question: "Can I use this app for academic purposes?",
      answer:
        "Yes. It is suitable for college projects and presentations, combining ML concepts with a simple web UI.",
    },
    {
      question: "What factors are considered in the prediction?",
      answer:
        "The model considers: age, gender, academic level, study hours, self-study, online classes, social media, gaming, screen time, sleep, exercise, caffeine, part-time job, deadlines, internet quality, mental health, focus, productivity, and exam performance.",
    },
    {
      question: "Is this app a replacement for professional help?",
      answer:
        "No. This is a screening and awareness tool, not a medical diagnosis. If you're in crisis or need support, contact a qualified professional or emergency services.",
    },
    {
      question: "How can I improve my burnout score?",
      answer:
        "Follow the suggestions after each assessment: prioritize sleep, use focused study blocks with breaks, manage screen time, move your body, and seek support when needed.",
    },
  ];

  return (
    <div className="min-h-screen py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-white/90 max-w-2xl drop-shadow">
            Find answers to common questions about BurnoutAI and how to use it effectively.
          </p>
        </div>

        <Card className="glass-card max-w-3xl mx-auto p-2 md:p-4 transition hover:shadow-2xl">
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-white/20">
                <AccordionTrigger className="text-left text-base font-semibold text-gray-900 hover:no-underline px-2">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-700 leading-relaxed px-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <div className="mt-16 glass-card rounded-2xl p-8 md:p-12 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Still have questions?</h2>
          <p className="text-gray-700 mb-6">Can&apos;t find what you need? Reach out from the contact page.</p>
          <Link href="/contact">
            <a className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg transition hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02]">
              Contact us
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
