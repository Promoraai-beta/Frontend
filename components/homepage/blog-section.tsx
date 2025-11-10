"use client"

import { motion } from "framer-motion"
import { ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"

const blogPosts = [
  {
    title: "The Future of Remote Hiring: AI-Powered Assessment",
    excerpt:
      "Discover how artificial intelligence is transforming the way companies evaluate candidates in a remote-first world.",
    date: "March 15, 2024",
    category: "AI & Technology",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "5 Ways to Ensure Assessment Integrity",
    excerpt: "Learn best practices for maintaining fairness and accuracy in your candidate evaluation process.",
    date: "March 10, 2024",
    category: "Best Practices",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Understanding Compliance in Modern Recruitment",
    excerpt: "A comprehensive guide to compliance monitoring and why it matters for your hiring process.",
    date: "March 5, 2024",
    category: "Compliance",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
]

export function BlogSection() {
  return (
    <section className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            <span className="text-balance">Latest insights</span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            Stay updated with the latest trends and best practices in recruitment technology.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link href="#" className="block h-full">
                <div className="relative h-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${post.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-4 text-sm text-zinc-400">
                      <span className="rounded-full bg-zinc-800 px-3 py-1">{post.category}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </span>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-white group-hover:text-zinc-300">{post.title}</h3>
                    <p className="mb-4 text-pretty text-zinc-400">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-sm font-medium">Read more</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
