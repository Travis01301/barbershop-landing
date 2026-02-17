import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `SELECT * FROM knowledge_base_articles 
               WHERE shop_id = $1 AND is_published = true`;
    const params: any[] = [shop_id];
    let paramIndex = 2;

    if (search) {
      sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY order_position, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Update view count
    result.rows.forEach(async (article) => {
      await query(
        'UPDATE knowledge_base_articles SET view_count = view_count + 1 WHERE id = $1',
        [article.id]
      );
    });

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM knowledge_base_articles 
                    WHERE shop_id = $1 AND is_published = true`;
    const countParams: any[] = [shop_id];
    let countParamIndex = 2;

    if (search) {
      countSql += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex} OR content ILIKE $${countParamIndex})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm);
      countParamIndex++;
    }

    if (category) {
      countSql += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    const countResult = await query(countSql, countParams);

    return NextResponse.json({
      articles: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching knowledge base articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const userResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows[0]?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      shop_id,
      title,
      description,
      content,
      category,
      tags,
      video_url,
      video_transcript,
      is_published = true,
      order_position = 0,
      seo_title,
      seo_description,
      seo_keywords
    } = await request.json();

    if (!title || !content || !category || !shop_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 500);

    const articleId = uuidv4();

    const result = await query(
      `INSERT INTO knowledge_base_articles 
       (id, shop_id, title, slug, description, content, category, tags, video_url, 
        video_transcript, author_id, is_published, order_position, seo_title, 
        seo_description, seo_keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        articleId,
        shop_id,
        title,
        slug,
        description,
        content,
        category,
        tags,
        video_url,
        video_transcript,
        auth.userId,
        is_published,
        order_position,
        seo_title,
        seo_description,
        seo_keywords
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
