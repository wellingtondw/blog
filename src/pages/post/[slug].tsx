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

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    main: {
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter()
  const [postReadingTime, setPostReadingTime] = useState(0)

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  useEffect(() => {
    const numberOfLetters = post.data.content.reduce((accumulator, currentValue) => {
      const result = RichText.asText(currentValue.body) + currentValue.heading
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
      <img src={post.data.main.url} alt='Imagem de inicio do post' className={styles.banner} />
      <main>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div>
            <time>
              <FiCalendar size='20' color='#BBBBBB'/>
              {post.first_publication_date}
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
                {postContent.body.map((post, index) => (
                  <p key={index}>{post.text}</p>
                ))}
              </div>
            )
          })}
        </article>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const { first_publication_date, data } = response

  const post: Post = {
    first_publication_date: format(
      new Date(first_publication_date),
      "dd LLL yyyy",
      {
        locale: ptBR
      }
    ),
    data: {
      main: {
        url:  data.main.url
      },
      title: data.title,
      author: data.author,
      content: data.content
    }
  }


  return {
    props: {
      post
    },
    revalidate: 60 * 60 // 1 hour
  }
};
