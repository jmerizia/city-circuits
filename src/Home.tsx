import React from "react";
import { Link } from "react-router-dom";



function Home() {
    return <div className='main-page'>
        <br />
        <h1>
            City Circuits
        </h1>
        <p>
            City Circuits is a visualization tool to help study and interpret open source language models, such as <a href='https://github.com/openai/gpt-2'>GPT-2</a>.
            City Circuits combines several interpretability methods,
            such as <a href='https://distill.pub/2018/building-blocks/'>saliency maps</a>,
            the <a href='https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens'>logit lens</a>,
            and <a href='https://arxiv.org/abs/2104.08696'>knowledge neurons</a> in
            an interactive fashion.
        </p>
        <p>
            Due to the size and diversity of modern datasets for language models,
            this project is (for now) narrowly focused on how GPT-2 stores knowledge about specific topics like
            the cities of the world.
        </p>
        <p>
            You can find the source code on <a href='https://github.com/jmerizia/city-circuits'>GitHub</a>.
        </p>
        <Link to={`${process.env.PUBLIC_URL}/viewer`} className='main-button'>
            Explore GPT-2 →
        </Link>
        <h2>
            Unsure where to begin?
        </h2>
        <p>
            Here are some interesting neurons to start with:
        </p>
        <ul>
            <li>
                <p>
                    <a href={`${process.env.PUBLIC_URL}/viewer?example=803&query=Paris&neuron=21-775`}>(21, 775)</a> -
                    this neuron activates most strongly when the words "city", "capital", or "town"
                    are followed by "of" or "in", indicating this neuron plays a role in signaling to future layers
                    that a capital, town, or city needs to be located to a broader geographical context.
                </p>
            </li>
            <li>
                <p>
                    <a href={`${process.env.PUBLIC_URL}/viewer?example=803&query=Paris&neuron=46-438`}>(46, 438)</a>
                    {' & '}
                    <a href={`${process.env.PUBLIC_URL}/viewer?example=803&query=Paris&neuron=46-5959`}>(46, 5959)</a> -
                    these neurons spike immediately after seeing the token "an" and pretty much nothing else,
                    which is peculiar, since they are both close to the last layer of the model.
                    The fact that this level of granularity of features is present this far down the network
                    is a testament to how different transformers are from convolutions.
                </p>
            </li>
            <li>
                <p>
                    <a href={`${process.env.PUBLIC_URL}/viewer?example=803&query=Paris&neuron=47-4365`}>(47, 4365)</a> -
                    similar to (46, 438) and (46, 5959), except it responds to "a" instead.
                </p>
            </li>
        </ul>
    </div>;
}

export default Home;