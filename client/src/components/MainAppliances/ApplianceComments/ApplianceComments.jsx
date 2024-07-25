import style from './ApplianceComments.module.css';

export default function ApplianceComments() {
    return (
        <>
            {/* comments container */}
            <div className={style.commentBlock}>

                {/* Comments are structured in the following way:
                                {ul} defines a new comment (singular)
                                {li} defines a new reply to the comment {ul}

                                example:

                                <ul>
                                    <comment>
                                        
                                    </comment

                                    <li>
                                        <reply>

                                        </reply>
                                    </li>

                                    <li>
                                        <reply>

                                        </reply>
                                    </li>

                                    <li>
                                        <reply>

                                        </reply>
                                    </li>
                                </ul>*/}

                {/* used by #{user} to create a new comment */}
                <div className={style.createNewComment}>
                    {/* the input field */}
                    <div className={style.inputComment}>
                        <input type="text" className={style.inputText} placeholder="Join the conversation.." />
                    </div>
                </div>
                {/* new comment */}
                <div className={style.newComment}>
                    {/* build comment */}
                    <ul className={style.userComment}>
                        {/* the comment body */}
                        <div className={style.commentBody}>
                            <p>
                                Sample comment!
                            </p>
                        </div>
                        {/* comments toolbar */}
                        <div className={style.commentToolbar}>
                            {/* inc. date and time */}
                            <div className={style.commentDetails}>
                                <ul>
                                    <li>
                                        <i className={`${style.fa} ${style.faClock}`} /> 13:94
                                    </li>
                                    <li>
                                        <i className={`${style.fa} ${style.faCalendar}`} /> 04/01/2015
                                    </li>
                                    <li>
                                        <i className={`${style.fa} ${style.faPencil}`} />{" "}
                                        <span className={style.user}>John Smith</span>
                                    </li>
                                </ul>
                            </div>
                            {/* inc. share/reply and love */}
                            <div className={style.commentTools}>
                                <ul>
                                    <li>
                                        <i className={`${style.fa} ${style.faShareAlt}`} />
                                    </li>
                                    <li>
                                        <i className={`${style.fa} ${style.faReply}`} />
                                    </li>
                                    <li>
                                        <i className={`${style.fa} ${style.faHeart} ${style.love}`} />
                                    </li>
                                </ul>
                            </div>
                        </div>
                        {/* start user replies */}
                        <li className={style.replay}>
                            {/* the comment body */}
                            <div className={style.commentBody}>
                                <div className={style.repliedTo}>
                                    <span className={style.user}>John Smith</span>
                                    <p>Sample answer!</p>
                                </div>
                            </div>
                            {/* comments toolbar */}
                            <div className={style.commentToolbar}>
                                {/* inc. date and time */}
                                <div className={style.commentDetails}>
                                    <ul>
                                        <li>
                                            <i className={`${style.fa} ${style.faClock}`} /> 14:52
                                        </li>
                                        <li>
                                            <i className={`${style.fa} ${style.faCalendar}`} /> 04/01/2015
                                        </li>
                                        <li>
                                            <i className={`${style.fa} ${style.faPencil}`} />{" "}
                                            <span className={style.user}>Andrew Johnson</span>
                                        </li>
                                    </ul>
                                </div>
                                {/* inc. share/reply and love */}
                                <div className={style.commentTools}>
                                    <ul>
                                        <li>
                                            <i className={`${style.fa} ${style.faShareAlt}`} />
                                        </li>
                                        <li>
                                            <i className={`${style.fa} ${style.faReply}`} />
                                        </li>
                                        <li>
                                            <i className={`${style.fa} ${style.faHeart} ${style.love}`}>
                                                <span className={style.loveAmt}> 4</span>
                                            </i>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}