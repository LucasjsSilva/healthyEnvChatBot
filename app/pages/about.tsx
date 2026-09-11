import Head from "next/head"
import Header from "../components/Header"
import Footer from "../components/Footer"
import Reveal from "../components/Reveal"
import styles from '../styles/About.module.css'

const contributors = [
  {
    year: '2023',
    name: 'Lucas Hiago Vilela',
    role: 'Fundação — Metrics OSS',
    description:
      'Desenvolveu o Metrics OSS, ferramenta que coleta métricas de projetos de software hospedados no GitHub e constrói datasets estruturados para análise comparativa.',
  },
  {
    year: '2024',
    name: 'Diego Winter',
    role: 'HealthyEnv — TCC',
    description:
      'Criou o HealthyEnv como TCC do curso de Ciência da Computação na UFPI, sob orientação do Prof. Dr. Guilherme Amaral Avelino. Introduziu a classificação por semelhança entre repositórios para que as comparações de métricas usem apenas projetos realmente parecidos.',
  },
  {
    year: '2026',
    name: 'Lucas Jesus Santos Silva',
    role: 'Chatbot com RAG — TCC',
    description:
      'Incorporou um assistente de inteligência artificial baseado em RAG (Retrieval-Augmented Generation) para explicar, em português simples, o que cada métrica significa e como o repositório avaliado pode melhorar. O chatbot responde perguntas contextualizadas sobre os resultados da análise.',
    highlight: true,
  },
]

const licenses = [
  {
    name: 'scikit-learn',
    type: 'BSD 3-Clause License',
    copyright: 'Copyright (c) 2007-2021 The scikit-learn developers.',
    body: `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

• Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
• Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
• Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.`,
  },
  {
    name: 'Flask',
    type: 'BSD 3-Clause License',
    copyright: 'Copyright 2010 Pallets',
    body: `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

• Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
• Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
• Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.`,
  },
  {
    name: 'Plotly.js',
    type: 'MIT License',
    copyright: 'Copyright (c) 2021 Plotly, Inc',
    body: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`,
  },
  {
    name: 'Next.js',
    type: 'MIT License',
    copyright: 'Copyright (c) 2022 Vercel, Inc.',
    body: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`,
  },
]

const About = () => {
  return (
    <>
      <Head>
        <title>HealthyEnv - Sobre</title>
      </Head>
      <Header />

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <Reveal>
            <span className={styles.badge}>Projeto Acadêmico · UFPI</span>
            <h1 className={styles.heroTitle}>Sobre o HealthyEnv</h1>
            <p className={styles.heroDesc}>
              Uma ferramenta open source para avaliação da saúde de repositórios de
              software, construída ao longo de três TCCs na Universidade Federal do Piauí,
              com orientação do Prof. Dr. Guilherme Amaral Avelino.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.section}>
        <div className={styles.sectionContent}>
          <Reveal>
            <h2 className={styles.sectionTitle}>História do projeto</h2>
            <p className={styles.sectionSubtitle}>
              Cada versão evoluiu sobre a anterior, ampliando o que a ferramenta é capaz de fazer.
            </p>
          </Reveal>

          <div className={styles.timeline}>
            {contributors.map((c, i) => (
              <Reveal key={c.name} delay={i * 100}>
                <div className={`${styles.timelineCard} ${c.highlight ? styles.timelineCardHighlight : ''}`}>
                  <div className={styles.timelineYear}>{c.year}</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineName}>{c.name}</span>
                      <span className={styles.timelineRole}>{c.role}</span>
                    </div>
                    <p className={styles.timelineDesc}>{c.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Licenses */}
      <div className={styles.licensesSection}>
        <div className={styles.sectionContent}>
          <Reveal>
            <h2 className={styles.sectionTitle}>Licenças de terceiros</h2>
            <p className={styles.sectionSubtitle}>
              O HealthyEnv utiliza as seguintes bibliotecas open source.
            </p>
          </Reveal>

          <div className={styles.licensesGrid}>
            {licenses.map((lic, i) => (
              <Reveal key={lic.name} delay={i * 60}>
                <div className={styles.licenseCard}>
                  <div className={styles.licenseHeader}>
                    <span className={styles.licenseName}>{lic.name}</span>
                    <span className={styles.licenseType}>{lic.type}</span>
                  </div>
                  <p className={styles.licenseCopyright}>{lic.copyright}</p>
                  <pre className={styles.licenseBody}>{lic.body}</pre>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default About
