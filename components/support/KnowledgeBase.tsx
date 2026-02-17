'use client';

import React, { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string;
  video_url?: string;
  view_count: number;
  helpful_count: number;
  unhelpful_count: number;
}

interface KnowledgeBaseProps {
  shopId: string;
}

export default function KnowledgeBase({ shopId }: KnowledgeBaseProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    searchArticles();
  }, [searchTerm, selectedCategory]);

  const searchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        shop_id: shopId,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { category: selectedCategory })
      });

      const response = await fetch(`/api/support/knowledge-base?${params}`);
      if (!response.ok) throw new Error('Failed to fetch articles');

      const data = await response.json();
      setArticles(data.articles);

      // Extract unique categories
      const cats = [...new Set(data.articles.map((a: Article) => a.category))];
      setCategories(cats as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!selectedArticle) return;

    try {
      const response = await fetch(`/api/support/knowledge-base/${selectedArticle.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful })
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      // Update article feedback count
      const updated = { ...selectedArticle };
      if (helpful) {
        updated.helpful_count += 1;
      } else {
        updated.unhelpful_count += 1;
      }
      setSelectedArticle(updated);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  if (selectedArticle) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="bg-gray-50 border-b p-6">
          <button
            onClick={() => setSelectedArticle(null)}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to Articles
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{selectedArticle.title}</h1>
          <p className="text-gray-600 mt-2">Category: {selectedArticle.category}</p>
        </div>

        <div className="p-6">
          {selectedArticle.description && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              {selectedArticle.description}
            </div>
          )}

          {selectedArticle.video_url && (
            <div className="mb-6">
              <iframe
                width="100%"
                height="400"
                src={selectedArticle.video_url}
                title="Tutorial Video"
                className="rounded-lg"
                allowFullScreen
              />
            </div>
          )}

          <div className="prose prose-sm max-w-none mb-6">
            <div className="whitespace-pre-wrap text-gray-700">
              {selectedArticle.content}
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-gray-700 mb-3">Was this article helpful?</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(true)}
                className="bg-green-100 text-green-700 hover:bg-green-200 font-semibold py-2 px-4 rounded-lg transition"
              >
                👍 Helpful ({selectedArticle.helpful_count})
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded-lg transition"
              >
                👎 Not Helpful ({selectedArticle.unhelpful_count})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Categories</h2>
          <button
            onClick={() => setSelectedCategory('')}
            className={`w-full text-left py-2 px-3 rounded-lg mb-2 transition ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            All Articles
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left py-2 px-3 rounded-lg mb-2 transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No articles found</p>
            <p className="text-gray-500 mt-2">Try searching with different keywords</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map(article => (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
                  {article.title}
                </h3>
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {article.description || article.content.substring(0, 150)}...
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {article.category}
                    </span>
                    {article.tags && (
                      <span className="text-gray-600">
                        Tags: {article.tags.split(',').slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                  <span>👁️ {article.view_count} views</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
