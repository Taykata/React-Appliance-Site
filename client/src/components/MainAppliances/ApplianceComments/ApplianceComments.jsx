import { useEffect, useState, useContext, useRef } from 'react';

import * as commentService from '../../../services/commentService';
import AuthContext from '../../../contexts/authContext';
import style from './ApplianceComments.module.css';

export default function ApplianceComments({ appliance }) {
    const [comments, setComments] = useState([]);
    const { isAuthenticated, username, userId } = useContext(AuthContext);
    const inputRef = useRef(null);
    
    let commentUsername;

    if (username?.includes('@')) {
        commentUsername = extractUsername(username);
    } else {
        commentUsername = username;
    }

    function extractUsername(email) {
        let uname = email.split('@')[0];

        if (uname) {
            uname = uname.charAt(0).toUpperCase() + uname.slice(1);
        }

        return uname;
    }

    useEffect(() => {
        commentService.getAllApplianceComments(appliance._id)
            .then(setComments);
    }, [appliance._id]);

    const addCommentHandler = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);

        const newComment = await commentService.createComment(
            appliance._id,
            commentUsername,
            formData.get('comment')
        );

        setComments(state => [...state, newComment]);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return {
            timeString: `${hours}:${minutes}`,
            dateString: `${day}/${month}/${year}`
        };
    };

    const onDelete = async (commentId) => {
        await commentService.deleteComment(commentId);

        setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
    }

    return (
        <>
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
                    </ul>
                */}

                {isAuthenticated && (
                    <div className={style.createNewComment}>
                        <form className={style.inputComment} onSubmit={addCommentHandler} >
                            <input name='comment' type="text" className={style.inputText} placeholder="Join the conversation.." ref={inputRef} />
                            <button className={style.sendButton}>Send</button>
                        </form>
                    </div>)}

                <div className={style.newComment}>
                    {comments.map(comment => {
                        const { timeString, dateString } = formatDate(comment._createdOn);

                        return (
                            <ul key={comment._id} className={style.userComment}>
                                <div className={style.commentBody}>
                                    <span className={style.user}>{comment.username}:</span>
                                    <p>{comment.text}</p>
                                    <div className={style.commentToolbar}>
                                        <div className={style.commentDetails}>
                                            <ul>
                                                <li>
                                                    <i className={`${style.fa} ${style.faClock}`} /> {timeString}
                                                </li>
                                                <li>
                                                    <i className={`${style.fa} ${style.faCalendar}`} /> {dateString}
                                                </li>
                                                {isAuthenticated && (
                                                <li className={style.btns}>
                                                    <button className={style.replyBtn}>
                                                        <img className={style.replyImg} src="/images/reply-16.png" alt="reply" />
                                                    </button>
                                                </li>
                                                )}
                                                {userId === comment._ownerId && (
                                                <li className={style.btns}>
                                                    <button className={style.deleteBtn} onClick={() => onDelete(comment._id)} >
                                                        <img className={style.deleteImg} src="/images/waste_bin.png" alt="delte" />
                                                    </button>
                                                </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* start user replies */}
                                <li className={style.replay}>
                                    {/* the comment body */}
                                    <div className={style.commentBody}>
                                        <span className={style.user}>Andrew Johnson:</span>
                                        <div className={style.repliedTo}>
                                            <p><span className={style.user}>John Smith</span> Sample answer!</p>
                                        </div>
                                        {/* comments toolbar */}
                                        <div className={style.commentToolbar}>
                                            {/* inc. date and time */}
                                            <div className={style.commentDetails}>
                                                <ul>
                                                    <li>
                                                        <i className={`${style.fa} ${style.faClockReply}`} /> 14:52
                                                    </li>
                                                    <li>
                                                        <i className={`${style.fa} ${style.faCalendar}`} /> 04/01/2015
                                                    </li>
                                                    <li className={style.btns}>
                                                        <button className={style.replyBtn}>
                                                            <img className={style.replyImg} src="/images/reply-16.png" alt="reply" />
                                                        </button>
                                                    </li>
                                                    <li className={style.btns}>
                                                        <button className={style.deleteBtn}>
                                                            <img className={style.deleteImg} src="/images/waste_bin.png" alt="delte" />
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        );
                    })}
                </div>

                {comments.length === 0 && (
                    <p className={style.message} >No Reviews Yet!</p>
                )}
            </div>
        </>
    );
}