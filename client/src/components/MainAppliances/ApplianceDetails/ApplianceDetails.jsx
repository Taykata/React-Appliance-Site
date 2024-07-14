import style from './ApplianceDetails.module.css';

export default function ApplianceDetails({ product, onClose }) {
    if (!product) return null;

    return (
        <div className={style.backdrop} onClick={onClose}>
            <div className={style.modal} onClick={e => e.stopPropagation()}>
                <article className={style.modalContainer}>
                    <header className={style.modalContainerHeader}>
                        <h1 className={style.modalContainerTitle}>
                            Details
                        </h1>
                        <button className={style.iconButton} onClick={onClose}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width={24}
                                height={24}
                            >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path
                                    fill="currentColor"
                                    d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"
                                />
                            </svg>
                        </button>
                    </header>
                    <section className={`${style.modalContainerBody} ${style.rtf}`}>
                        <img className={style.img} src={product.image} alt="Product's image" />
                        <div className={style.rightContainer}>
                            <p className={style.right}>Title: {product.title}</p>
                            <p className={style.right}>Brand: {product.brand}</p>
                            <p className={style.right}>Price: {product.price}</p>
                        </div>
                        <p className={style.description}>{product.description}</p>
                    </section>
{/* 
                    <footer className={style.modalContainerFooter}>
                        <button className={`${style.button} ${style.isGhost}`}>Edit</button>
                        <button className={`${style.button} ${style.isPrimary}`}>Delete</button>
                    </footer>
*/}
                </article>
            </div>
        </div>
    );
}
