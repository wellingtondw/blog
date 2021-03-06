import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router'
import format from 'date-fns/format';
import ptBR from 'date-fns/locale/pt-BR'

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client'

import { RichText } from "prismic-dom"

import { FiCalendar, FiUser , FiClock } from 'react-icons/fi'

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { Comments } from '../../components/Comments';
import Link from 'next/link';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PrevNextPost {
  data: {
    title,
  },
  uid: string
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: PrevNextPost[];
  nextPost: PrevNextPost[];
}

export default function Post({ post, preview, prevPost, nextPost }: PostProps) {
  const router = useRouter()
  const [postReadingTime, setPostReadingTime] = useState(0)

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  useEffect(() => {
    const numberOfLetters = post.data.content.reduce((accumulator, currentValue) => {
      const result = RichText.asText(currentValue.body).split(' ')
      return accumulator += result.length
    }, 0)

    const readingTime = Math.ceil(numberOfLetters / 200)

    setPostReadingTime(readingTime)
  }, [post])

  return (
    <>
      <Head>
        <title>{post.data.title} | Blog</title>
      </Head>
      <Header />
      <div className={styles.banner} style={{ backgroundImage: `url(${post.data.banner.url})` }}/>
      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
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

            <p>
              <FiClock size='20' color='#BBBBBB'/>
              {postReadingTime} min
            </p>
          </div>
          {post.data.content.map(postContent => {
            return (
              <div className={styles.postContent} key={postContent.heading}>
                <h2>{postContent.heading}</h2>
                <div dangerouslySetInnerHTML={{ __html: RichText.asHtml(postContent.body) }}/>
              </div>
            )
          })}
        </article>

        <div className={styles.border}/>

        <div className={styles.containerPrevAndNextPosts}>
          {prevPost.length > 0 && (
            <div>
              <p>{prevPost[0].data.title}</p>
              <Link href={`/post/${prevPost[0].uid}`}>
                <a className={commonStyles.loadMore}>Post anterior</a>
              </Link>
            </div>
          )}

          {nextPost.length > 0 && (
            <div className={styles.nextPost}>
              <p>{nextPost[0].data.title}</p>
              <Link href={`/post/${nextPost[0].uid}`}>
                <a className={commonStyles.loadMore}>Pr??ximo post</a>
              </Link>
            </div>
          )}

        </div>

        <Comments />
        {preview && (
          <aside className={commonStyles.exitPreviewMode}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(Prismic.predicates.at('document.type', 'posts'));

  const slugsList = posts.results.map(post => {
     return {
        params: {
          slug: post.uid
        }
      }
   })

  return {
    paths: slugsList,
    fallback: 'blocking'
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData
 }) => {
  const { slug } = params
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null
  });


  const { first_publication_date, uid, data } = response

  const prevPost = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    after: response.id,
    orderings : '[document.last_publication_date desc]'
  })

  const nextPost = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    after: response.id,
    orderings : '[document.last_publication_date]'
  })

  const post: Post = {
    uid,
    first_publication_date,
    data: {
      banner: {
        url:  data.banner.url
      },
      title: data.title,
      subtitle: data.subtitle,
      author: data.author,
      content: data.content
    }
  }


  return {
    props: {
      post,
      preview,
      prevPost: prevPost.results,
      nextPost: nextPost.results
    },
    revalidate: 60 * 60 // 1 hour
  }
};
