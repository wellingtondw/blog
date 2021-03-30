import { GetStaticProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'

import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import Prismic from '@prismicio/client'
import { getPrismicClient } from '../services/prismic'

import { FiCalendar, FiUser } from 'react-icons/fi'

import commonStyles from '../styles/common.module.scss'
import styles from './home.module.scss'
import { useState } from 'react'
import Header from '../components/Header'

interface Post {
  uid?: string
  first_publication_date: string | null
  data: {
    title: string
    subtitle: string
    author: string
  }
}

interface PostPagination {
  next_page: string
  results: Post[]
}

interface HomeProps {
  postsPagination: PostPagination
  preview: boolean
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const [nextPage, setNextPage] = useState(postsPagination.next_page)
  const [posts, setPosts] = useState<Post[]>([...postsPagination.results])

  async function handleGetMorePosts() {
    const response = await fetch(nextPage)
    const data = await response.json()

    setNextPage(data.next_page)
    setPosts([...posts, ...data.results])
  }

  return (
    <>
      <Head>
          <title>Posts | Blog</title>
      </Head>
      <Header />
      <div className={styles.container}>
        {posts.map(post => (
          <Link href={`post/${post.uid}`} key={post.uid}>
            <a href={`post/${post.uid}`}>
              <h2>{post.data.title}</h2>
              <h3>{post.data.subtitle}</h3>
              <div>
                <time>
                  <FiCalendar size='20' color='#BBBBBB'/>
                  {
                    format(
                      new Date(post.first_publication_date),
                      "dd LLL yyyy",
                      {
                        locale: ptBR
                      }
                    )
                  }
                </time>
                <p>
                  <FiUser size='20' color='#BBBBBB'/>
                  {post.data.author}
                </p>
              </div>
            </a>
          </Link>
        ))}
        {nextPage && (
          <button className={styles.loadMore} onClick={handleGetMorePosts}>Carregar mais posts</button>
        )}

        {preview && (
          <aside className={commonStyles.exitPreviewMode}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient()
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['posts.title', 'posts.author', 'posts.subtitle', 'posts.content', 'post.next_page'],
    pageSize : 2,
    ref: previewData?.ref ?? null
  })

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date:post.first_publication_date,
      data: {
        author: post.data.author,
        title: post.data.title,
        subtitle: post.data.subtitle
      }
    }
  })

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page
      },
      preview
    },
    revalidate: 60 * 60 // 1 hour
  }
}
