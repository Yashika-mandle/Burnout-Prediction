import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    setTimeout(() => {
      setSubmitted(true);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", message: "" });
      setLoading(false);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    }, 1000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="glass-card w-full max-w-md shadow-2xl text-center p-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your message has been sent successfully. We'll get back to you as soon as possible.
          </p>
          <Link href="/">
            <a className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition">
              Back to Home
            </a>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-white/90 max-w-2xl drop-shadow">
            Have questions or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            {/* Email */}
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600 text-sm">yourname@example.com</p>
                  <p className="text-gray-600 text-sm">We'll respond within 24 hours</p>
                </div>
              </div>
            </Card>

            {/* Phone */}
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600 text-sm">10101010</p>
                  <p className="text-gray-600 text-sm">Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-600 text-sm">AIRT</p>
                </div>
              </div>
            </Card>

            {/* Social Links */}
            <Card className="glass-card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
                >
                  f
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
                >
                  𝕏
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
                >
                  in
                </a>
              </div>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="glass-card p-8 transition hover:shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-gray-700 font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-2 bg-gray-50 border-gray-300"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="yourname@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-2 bg-gray-50 border-gray-300"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-gray-700 font-medium">
                    Message
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can help..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" size={20} />
                      Send Message
                    </>
                  )}
                </Button>
              </form>

            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
